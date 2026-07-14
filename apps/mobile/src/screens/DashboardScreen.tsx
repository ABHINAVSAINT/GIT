import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../design-system/theme/ThemeProvider';
import { useFinanceStore } from '../store/financeStore';
import { useUIStore } from '../store/uiStore';
import { getAllAccounts } from '../storage/repositories/accountRepository';
import { getAllTransactions } from '../storage/repositories/transactionRepository';
import type { Account } from '@finance/engine';

type StackParamList = {
  Main: undefined;
  AddTransaction: undefined;
};

const ACCOUNT_GROUPS = [
  { key: 'banking', label: 'Bank Accounts', types: ['savings', 'checking', 'cash'] as string[], icon: '🏦' },
  { key: 'credit', label: 'Credit Cards', types: ['credit_card'] as string[], icon: '💳' },
  { key: 'emi', label: 'EMI Cards', types: ['emi_card'] as string[], icon: '🛍️' },
  { key: 'investments', label: 'Investments', types: ['investment'] as string[], icon: '📈' },
  { key: 'deposits', label: 'Fixed Deposits', types: ['fixed_deposit'] as string[], icon: '🏛️' },
];

export function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<StackParamList>>();

  const accounts = useFinanceStore(s => s.accounts);
  const netWorth = useFinanceStore(s => s.netWorth);
  const monthlyCashflow = useFinanceStore(s => s.monthlyCashflow);
  const setAccounts = useFinanceStore(s => s.setAccounts);
  const setTransactions = useFinanceStore(s => s.setTransactions);
  const addLoading = useUIStore(s => s.addLoading);
  const removeLoading = useUIStore(s => s.removeLoading);

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    addLoading('dashboard');
    try {
      const [accts, txns] = await Promise.all([
        getAllAccounts(),
        getAllTransactions(500),
      ]);
      setAccounts(accts);
      setTransactions(txns);
    } finally {
      removeLoading('dashboard');
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }

  function formatINR(paise: number): string {
    const rupees = Math.abs(paise) / 100;
    return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function getAccountsByGroup(types: string[]): Account[] {
    return accounts.filter(a => types.includes(a.type) && !a.isHidden);
  }

  const ccAccounts = accounts.filter(a => a.type === 'credit_card' && !a.isHidden);
  const totalCcOutstanding = ccAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const totalCcLimit = ccAccounts.reduce((sum, a) => sum + (a.creditLimit ?? 0), 0);

  const invAccounts = accounts.filter(a => a.type === 'investment' && !a.isHidden);
  const totalInvested = invAccounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Net Worth Hero */}
        <View style={[styles.heroCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.heroLabel, { color: theme.colors.textSecondary }]}>
            Net Worth
          </Text>
          <Text style={[styles.heroValue, { color: netWorth >= 0 ? theme.colors.success : theme.colors.danger }]}>
            {formatINR(netWorth)}
          </Text>
          <Text style={[styles.heroSub, { color: theme.colors.textTertiary }]}>
            {accounts.filter(a => !a.isHidden).length} accounts
          </Text>
        </View>

        {/* KPI Row */}
        <View style={styles.kpiRow}>
          <KPICard label="Income" value={formatINR(monthlyCashflow.income)} color={theme.colors.success} theme={theme} />
          <KPICard label="Expenses" value={formatINR(monthlyCashflow.expenses)} color={theme.colors.danger} theme={theme} />
          <KPICard label="Saved" value={formatINR(monthlyCashflow.netSavings)} color={monthlyCashflow.netSavings >= 0 ? theme.colors.success : theme.colors.danger} theme={theme} />
        </View>

        {/* Credit Card Summary */}
        {ccAccounts.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>💳 Credit Cards</Text>
            <View style={styles.summaryRow}>
              <View>
                <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Outstanding</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.danger }]}>{formatINR(totalCcOutstanding)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Total Limit</Text>
                <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatINR(totalCcLimit)}</Text>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.progressFill, {
                width: `${totalCcLimit > 0 ? Math.min((totalCcOutstanding / totalCcLimit) * 100, 100) : 0}%`,
                backgroundColor: totalCcOutstanding / totalCcLimit > 0.7 ? theme.colors.danger : theme.colors.warning,
              }]} />
            </View>
            <Text style={[styles.utilText, { color: theme.colors.textTertiary }]}>
              {totalCcLimit > 0 ? Math.round((totalCcOutstanding / totalCcLimit) * 100) : 0}% utilised
            </Text>
          </View>
        )}

        {/* Investment Summary */}
        {invAccounts.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>📈 Investments</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.success }]}>{formatINR(totalInvested)}</Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textTertiary }]}>Portfolio Value</Text>
          </View>
        )}

        {/* Account Groups */}
        {ACCOUNT_GROUPS.map(group => {
          const groupAccounts = getAccountsByGroup(group.types);
          if (groupAccounts.length === 0) return null;
          return (
            <View key={group.key} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {group.label}
              </Text>
              {groupAccounts.map(account => (
                <View key={account.id} style={[styles.accountRow, { backgroundColor: theme.colors.surface }]}>
                  <Text style={styles.accountIcon}>{account.icon}</Text>
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: theme.colors.text }]}>{account.name}</Text>
                    <Text style={[styles.accountType, { color: theme.colors.textTertiary }]}>
                      {account.type.replace('_', ' ')}
                      {account.creditLimit ? ` · Limit ${formatINR(account.creditLimit)}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.accountBalance, {
                    color: account.type === 'credit_card'
                      ? theme.colors.danger
                      : account.balance >= 0 ? theme.colors.text : theme.colors.danger
                  }]}>
                    {account.type === 'credit_card' ? '-' : ''}{formatINR(account.balance)}
                  </Text>
                </View>
              ))}
            </View>
          );
        })}

      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => navigation.navigate('AddTransaction')}
        style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 16 }]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function KPICard({ label, value, color, theme }: { label: string; value: string; color: string; theme: any }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.kpiLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    marginHorizontal: 16, marginTop: 16, padding: 24, borderRadius: 16, alignItems: 'center',
  },
  heroLabel: { fontSize: 14, fontWeight: '500', marginBottom: 4 },
  heroValue: { fontSize: 36, fontWeight: '700', marginBottom: 4 },
  heroSub: { fontSize: 13 },
  kpiRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, gap: 8 },
  kpiCard: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  kpiLabel: { fontSize: 11, fontWeight: '500', marginBottom: 4 },
  kpiValue: { fontSize: 16, fontWeight: '700' },
  summaryCard: {
    marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 12,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 12, marginTop: 2 },
  summaryValue: { fontSize: 20, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  utilText: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  section: { marginTop: 20, marginHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 6,
  },
  accountIcon: { fontSize: 22, marginRight: 12 },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: '600' },
  accountType: { fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  accountBalance: { fontSize: 15, fontWeight: '700' },
  fab: {
    position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6,
  },
  fabText: { color: '#FFFFFF', fontSize: 28, fontWeight: '400', marginTop: -2 },
});
