import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../design-system/theme/ThemeProvider';
import { useSettingsStore } from '../store/settingsStore';
import { useFinanceStore } from '../store/financeStore';

export function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const taxRegime = useSettingsStore(s => s.taxRegime);
  const setTaxRegime = useSettingsStore(s => s.setTaxRegime);
  const testMode = useSettingsStore(s => s.testMode);
  const setTestMode = useSettingsStore(s => s.setTestMode);
  const accounts = useFinanceStore(s => s.accounts);

  function handleTaxRegimeToggle() {
    Alert.alert(
      'Tax Regime',
      'Select your tax regime for FY 2025-26',
      [
        { text: 'Old Regime', onPress: () => setTaxRegime('old') },
        { text: 'New Regime', onPress: () => setTaxRegime('new') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  function handleTestModeToggle() {
    Alert.alert(
      'Test Mode',
      testMode
        ? 'Test mode is ON. Disable it to hide seed data.'
        : 'Enable test mode to load sample transactions on next launch.',
      [
        { text: testMode ? 'Disable' : 'Enable', onPress: () => setTestMode(!testMode) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  const ccAccounts = accounts.filter(a => a.type === 'credit_card' && !a.isHidden);
  const emiAccounts = accounts.filter(a => a.type === 'emi_card' && !a.isHidden);
  const fdAccounts = accounts.filter(a => a.type === 'fixed_deposit' && !a.isHidden);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 100 }}
    >
      <Text style={[styles.heading, { color: theme.colors.text }]}>Settings</Text>

      <Section title="Account Summary" theme={theme}>
        <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Total Accounts</Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{accounts.length}</Text>
        </View>
        {ccAccounts.length > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Credit Cards</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{ccAccounts.length}</Text>
          </View>
        )}
        {emiAccounts.length > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>EMI Cards</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{emiAccounts.length}</Text>
          </View>
        )}
        {fdAccounts.length > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Fixed Deposits</Text>
            <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>{fdAccounts.length}</Text>
          </View>
        )}
      </Section>

      <Section title="Tax" theme={theme}>
        <Pressable style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]} onPress={handleTaxRegimeToggle}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Tax Regime</Text>
          <Text style={[styles.rowValue, { color: theme.colors.primary }]}>{taxRegime === 'old' ? 'Old Regime' : 'New Regime'} ›</Text>
        </Pressable>
        <View style={styles.summaryRow}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Tax Year</Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>2025-26</Text>
        </View>
      </Section>

      <Section title="Developer" theme={theme}>
        <Pressable style={[styles.summaryRow, { borderBottomColor: theme.colors.border }]} onPress={handleTestModeToggle}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Test Mode</Text>
          <Text style={[styles.rowValue, { color: testMode ? theme.colors.success : theme.colors.textSecondary }]}>
            {testMode ? 'ON' : 'OFF'} ›
          </Text>
        </Pressable>
      </Section>

      <Section title="About" theme={theme}>
        <View style={styles.summaryRow}>
          <Text style={[styles.rowLabel, { color: theme.colors.text }]}>Version</Text>
          <Text style={[styles.rowValue, { color: theme.colors.textSecondary }]}>1.0.0</Text>
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ title, theme, children }: { title: string; theme: any; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 28, fontWeight: '700', marginBottom: 24, paddingHorizontal: 16 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { borderRadius: 12, overflow: 'hidden' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 14 },
});
