import { Platform } from 'react-native';
import PushNotification from 'react-native-push-notification';
import { getDatabase } from '../storage/database';

/**
 * Notification Service
 * Handles scheduling reminders for FD maturities and EMI payments.
 * Uses react-native-push-notification for bare React Native.
 */

// Configure notification channel and handler
PushNotification.configure({
  onRegister: function (token) {
    console.log('Push notification token:', token);
  },
  onNotification: function (notification) {
    console.log('Notification received:', notification);
  },
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: Platform.OS === 'android',
});

// Create Android notification channel
if (Platform.OS === 'android') {
  PushNotification.createChannel(
    {
      channelId: 'reminders',
      channelName: 'Reminders',
      channelDescription: 'FD maturity and EMI payment reminders',
      importance: 4, // HIGH
      vibrate: true,
    },
    () => {}
  );
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    PushNotification.requestPermissions(
      Platform.OS === 'android' ? 'reminders' : undefined,
      (granted) => {
        resolve(granted);
      }
    );
  });
}

export async function scheduleFDMaturityReminder(
  accountId: string,
  accountName: string,
  maturityDate: string,
  amount: number
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const maturity = new Date(maturityDate);
    const now = new Date();

    // Schedule 7 days before maturity
    const reminderDate = new Date(maturity);
    reminderDate.setDate(reminderDate.getDate() - 7);
    reminderDate.setHours(9, 0, 0, 0); // 9 AM

    if (reminderDate <= now) {
      // Maturity is within 7 days, schedule for tomorrow
      reminderDate.setTime(now.getTime() + 24 * 60 * 60 * 1000);
      reminderDate.setHours(9, 0, 0, 0);
    }

    const amountFormatted = `₹${(amount / 100).toLocaleString('en-IN')}`;
    const id = `fd_${accountId}_${Date.now()}`;

    PushNotification.localNotificationSchedule({
      channelId: 'reminders',
      title: 'FD Maturity Soon',
      message: `${accountName} matures on ${maturityDate} (${amountFormatted}). Consider renewal options.`,
      date: reminderDate,
      playSound: true,
      soundName: 'default',
      userInfo: { accountId, type: 'fd_maturity' },
    });

    // Store reminder in database
    const db = getDatabase();
    db.execute(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      [`reminder_fd_${accountId}`, JSON.stringify({ id, maturityDate, amount })]
    );

    return id;
  } catch (error) {
    console.error('Failed to schedule FD maturity reminder:', error);
    return null;
  }
}

export async function scheduleEMIPaymentReminder(
  accountId: string,
  accountName: string,
  dueDay: number,
  emiAmount: number
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const now = new Date();
    let nextDue = new Date(now.getFullYear(), now.getMonth(), dueDay);

    if (nextDue <= now) {
      nextDue = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
    }

    // Schedule 2 days before due date
    const reminderDate = new Date(nextDue);
    reminderDate.setDate(reminderDate.getDate() - 2);
    reminderDate.setHours(18, 0, 0, 0); // 6 PM

    if (reminderDate <= now) {
      reminderDate.setTime(now.getTime() + 24 * 60 * 60 * 1000);
      reminderDate.setHours(18, 0, 0, 0);
    }

    const amountFormatted = `₹${(emiAmount / 100).toLocaleString('en-IN')}`;
    const id = `emi_${accountId}_${Date.now()}`;

    PushNotification.localNotificationSchedule({
      channelId: 'reminders',
      title: 'EMI Payment Due',
      message: `${accountName} EMI of ${amountFormatted} due on ${nextDue.toISOString().split('T')[0]}.`,
      date: reminderDate,
      playSound: true,
      soundName: 'default',
      userInfo: { accountId, type: 'emi_payment' },
    });

    // Store reminder in database
    const db = getDatabase();
    db.execute(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
      [`reminder_emi_${accountId}`, JSON.stringify({ id, dueDay, emiAmount })]
    );

    return id;
  } catch (error) {
    console.error('Failed to schedule EMI payment reminder:', error);
    return null;
  }
}

export async function cancelReminder(accountId: string, type: 'fd' | 'emi'): Promise<void> {
  try {
    const db = getDatabase();
    const key = `reminder_${type}_${accountId}`;
    const row = db.getFirst<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = ?`,
      [key]
    );

    if (row) {
      const data = JSON.parse(row.value);
      if (data.id) {
        PushNotification.cancelLocalNotifications({ id: data.id });
      }
      db.execute(`DELETE FROM app_settings WHERE key = ?`, [key]);
    }
  } catch (error) {
    console.error('Failed to cancel reminder:', error);
  }
}

export async function cancelAllReminders(): Promise<void> {
  try {
    PushNotification.cancelAllLocalNotifications();
    const db = getDatabase();
    db.execute(`DELETE FROM app_settings WHERE key LIKE 'reminder_%'`);
  } catch (error) {
    console.error('Failed to cancel all reminders:', error);
  }
}
