import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../design-system/theme/ThemeProvider';
import { useFinanceStore } from '../store/financeStore';
import { getAllTransactions } from '../storage/repositories/transactionRepository';
import { getAllAccounts } from '../storage/repositories/accountRepository';
import { getAllCategories } from '../storage/repositories/categoryRepository';
import { isIncomeType, isExpenseType, isTransferType, isInvestmentType } from '@finance/engine';
import type { Transaction, Category, Account } from '@finance/engine';

type FilterKey = 'all' | 'income' | 'expense' | 'transfer' | 'investment';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
  { key: 'transfer', label: 'Transfers' },
  { key: 'investment', label: 'Investments' },
];

export function TransactionsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');

  const setTransactionsStore = useFinanceStore(s => s.setTransactions);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [txns, cats, accts] = await Promise.all([
      getAllTransactions(300),
      getAllCategories(),
      getAllAccounts(),
    ]);
    setTransactions(txns);
    setCategories(cats);
    setAccounts(accts);
    setTransactionsStore(txns);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function getCategoryIcon(categoryId: string): string {
    return categories.find(c => c.id === categoryId)?.icon ?? '📦';
  }

  function getCategoryName(categoryId: string): string {
    return categories.find(c => c.id === categoryId)?.name ?? 'Unknown';
  }

  function getAccountName(accountId: string): string {
    return accounts.find(a => a.id === accountId)?.name ?? 'Unknown';
  }

  function getAccountIcon(accountId: string): string {
    return accounts.find(a => a.id === accountId)?.icon ?? '💰';
  }

  function formatINR(paise: number): string {
    const rupees = Math.abs(paise) / 100;
    return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day} ${months[d.getMonth()]}`;
  }

  function matchesFilter(t: Transaction, f: FilterKey): boolean {
    if (f === 'all') return true;
    if (f === 'income') return isIncomeType(t.type);
    if (f === 'expense') return isExpenseType(t.type);
    if (f === 'transfer') return isTransferType(t.type);
    if (f === 'investment') return isInvestmentType(t.type);
    return true;
  }

  const filtered = transactions.filter(t => matchesFilter(t, filter));

  // Group by month
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, txn) => {
    const monthKey = txn.date.substring(0, 7);
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(txn);
    return acc;
  }, {});

  const monthKeys = Object.keys(grouped).sort().reverse();

  function getMonthLabel(key: string): string {
    const [y, m] = key.split('-');
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[parseInt(m) - 1]} ${y}`;
  }

  function getTxnSign(t: Transaction): boolean {
    return isIncomeType(t.type);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ paddingTop: insets.top }}>
        <View style={styles.filterRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: filter === f.key ? theme.colors.primary : theme.colors.surface,
                  borderColor: filter === f.key ? theme.colors.primary : theme.colors.border,
                }
              ]}
            >
              <Text style={{
                color: filter === f.key ? '#FFFFFF' : theme.colors.textSecondary,
                fontWeight: '600', fontSize: 12,
              }}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={monthKeys}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No transactions yet.
            </Text>
          </View>
        }
        renderItem={({ item: monthKey }) => {
          const monthTxns = grouped[monthKey];
          const monthIncome = monthTxns.filter(t => isIncomeType(t.type)).reduce((s, t) => s + t.amount, 0);
          const monthExpense = monthTxns.filter(t => isExpenseType(t.type)).reduce((s, t) => s + Math.abs(t.amount), 0);

          return (
            <View style={styles.monthSection}>
              <View style={styles.monthHeader}>
                <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
                  {getMonthLabel(monthKey)}
                </Text>
                <View style={styles.monthSummary}>
                  {monthIncome > 0 && (
                    <Text style={[styles.monthIncome, { color: theme.colors.success }]}>
                      +{formatINR(monthIncome)}
                    </Text>
                  )}
                  {monthExpense > 0 && (
                    <Text style={[styles.monthExpense, { color: theme.colors.danger }]}>
                      -{formatINR(monthExpense)}
                    </Text>
                  )}
                </View>
              </View>
              {monthTxns.map(txn => {
                const isIncome = getTxnSign(txn);
                const cbPaise = (txn as any).cashbackPaise;
                const cbDesc = (txn as any).cashbackDescription;
                const hasCounterpart = txn.counterpartAccountId;
                return (
                  <View key={txn.id} style={[styles.txnRow, { backgroundColor: theme.colors.surface }]}>
                    <Text style={styles.txnIcon}>{getCategoryIcon(txn.categoryId)}</Text>
                    <View style={styles.txnInfo}>
                      <Text style={[styles.txnDesc, { color: theme.colors.text }]} numberOfLines={1}>
                        {txn.description}
                      </Text>
                      <Text style={[styles.txnCat, { color: theme.colors.textTertiary }]}>
                        {getCategoryName(txn.categoryId)} · {formatDate(txn.date)}
                      </Text>
                      {hasCounterpart && (
                        <Text style={[styles.txnLink, { color: theme.colors.info }]}>
                          {getAccountIcon(txn.accountId)} {getAccountName(txn.accountId)} → {getAccountIcon(txn.counterpartAccountId!)} {getAccountName(txn.counterpartAccountId!)}
                        </Text>
                      )}
                      {cbPaise != null && cbPaise > 0 && (
                        <View style={styles.cashbackBadge}>
                          <Text style={styles.cashbackText}>
                            💰 +₹{Math.round(cbPaise / 100)}
                          </Text>
                          {cbDesc && cbDesc !== 'No cashback' && cbDesc !== 'No monies' && (
                            <Text style={[styles.cashbackLabel, { color: theme.colors.textTertiary }]}>
                              {cbDesc}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.txnAmount,
                      { color: isIncome ? theme.colors.success : theme.colors.danger }
                    ]}>
                      {isIncome ? '+' : '-'}{formatINR(txn.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 6,
  },
  filterTab: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1,
  },
  monthSection: { marginTop: 16 },
  monthHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  monthTitle: { fontSize: 15, fontWeight: '700' },
  monthSummary: { flexDirection: 'row', gap: 12 },
  monthIncome: { fontSize: 13, fontWeight: '600' },
  monthExpense: { fontSize: 13, fontWeight: '600' },
  txnRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 6,
  },
  txnIcon: { fontSize: 20, marginRight: 10 },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 14, fontWeight: '500' },
  txnCat: { fontSize: 11, marginTop: 2 },
  txnLink: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  txnAmount: { fontSize: 14, fontWeight: '700' },
  emptyCard: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  cashbackBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3,
  },
  cashbackText: { fontSize: 11, fontWeight: '600', color: '#10B981' },
  cashbackLabel: { fontSize: 10 },
});
