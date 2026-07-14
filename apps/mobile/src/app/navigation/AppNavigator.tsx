import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../design-system/theme/ThemeProvider';
import { useSettingsStore } from '../../store/settingsStore';

import { DashboardScreen } from '../../screens/DashboardScreen';
import { TransactionsScreen } from '../../screens/TransactionsScreen';
import { InsightsScreen } from '../../screens/InsightsScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { OnboardingScreen } from '../../screens/OnboardingScreen';
import { AddTransactionScreen } from '../../screens/AddTransactionScreen';

type TabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Insights: undefined;
  Settings: undefined;
};

type StackParamList = {
  Onboarding: undefined;
  Main: undefined;
  AddTransaction: undefined;
  AccountDetail: { accountId: string };
  InvestmentDetail: { investmentId: string };
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<StackParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Transactions: '💳',
    Insights: '📈',
    Settings: '⚙️',
  };

  return (
    <View style={styles.tabIcon}>
      <Text style={{ fontSize: focused ? 24 : 20 }}>{icons[label] ?? '📋'}</Text>
    </View>
  );
}

function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.tabBarBorder,
        },
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const onboardingComplete = useSettingsStore((s) => s.onboardingComplete);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!onboardingComplete ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="AddTransaction"
            component={AddTransactionScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: 'center', justifyContent: 'center' },
});
