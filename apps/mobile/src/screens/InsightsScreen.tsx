import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../design-system/theme/ThemeProvider';
import { useFinanceStore } from '../store/financeStore';
import { getAllTransactions } from '../storage/repositories/transactionRepository';
import { getAllCategories } from '../storage/repositories/categoryRepository';
import { generateInsights, computePortfolioMetrics } from '@finance/engine';
import type { Transaction, Category, Insight } from '@finance/engine';

export function InsightsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [portfolioText, setPortfolioText] = useState<string>('');

  const netWorth = useFinanceStore(s => s.netWorth);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [transactions, categories] = await Promise.all([
      getAllTransactions(500),
      getAllCategories(),
    ]);

    const generatedInsights = generateInsights(transactions, categories, netWorth);
    setInsights(generatedInsights);

    // Compute spending summary
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    const thisMonthTxns = transactions.filter(t =>
      t.date.startsWith(thisMonth) && ['expense', 'fee', 'emi_purchase'].includes(t.type)
    );
    const lastMonthTxns = transactions.filter(t =>
      t.date.startsWith(lastMonthStr) && ['expense', 'fee', 'emi_purchase'].includes(t.type)
    );

    const thisMonthTotal = thisMonthTxns.reduce((s, t) => s + t.amount, 0);
    const lastMonthTotal = lastMonthTxns.reduce((s, t) => s + t.amount, 0);

    // Top spending categories this month
    const byCategory = thisMonthTxns.reduce<Record<string, number>>((acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
      return acc;
    }, {});

    const topCategories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const summary = [
      `This month: ₹${(thisMonthTotal / 100).toLocaleString('en-IN')}`,
      `Last month: ₹${(lastMonthTotal / 100).toLocaleString('en-IN')}`,
      lastMonthTotal > 0
        ? `Change: ${(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(0)}%`
        : '',
      '',
      'Top spending:',
      ...topCategories.map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        return `  ${cat?.icon ?? '📦'} ${cat?.name ?? 'Unknown'}: ₹${(amount / 100).toLocaleString('en-IN')}`;
      }),
    ].filter(Boolean).join('\n');

    setPortfolioText(summary);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function formatINR(paise: number): string {
    const rupees = Math.abs(paise) / 100;
    return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function getInsightIcon(type: string): string {
    const icons: Record<string, string> = {
      spending_anomaly: '⚠️',
      subscription_detected: '🔄',
      budget_breach: '🚫',
      low_balance: '💸',
      recurring_charge_change: '📈',
      unusual_category: '❓',
      savings_opportunity: '💰',
      investment_rebalance: '⚖️',
      goal_progress: '🎯',
      tax_optimization: '📋',
    };
    return icons[type] ?? '💡';
  }

  function getInsightColor(type: string, colors: any): string {
    if (['low_balance', 'budget_breach', 'spending_anomaly'].includes(type)) return colors.warning;
    if (['savings_opportunity', 'goal_progress'].includes(type)) return colors.success;
    return colors.info;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Spending Summary */}
      <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.summaryTitle, { color: theme.colors.text }]}>Spending Summary</Text>
        <Text style={[styles.summaryText, { color: theme.colors.textSecondary }]}>
          {portfolioText}
        </Text>
      </View>

      {/* Insights */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Insights
        </Text>
        {insights.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Add more transactions to see insights.
            </Text>
          </View>
        ) : (
          insights.map((insight, i) => (
            <View
              key={`${insight.type}-${i}`}
              style={[styles.insightCard, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>{getInsightIcon(insight.type)}</Text>
                <View style={styles.insightTitleRow}>
                  <Text style={[styles.insightTitle, { color: theme.colors.text }]}>
                    {insight.title}
                  </Text>
                </View>
              </View>
              <Text style={[styles.insightDesc, { color: theme.colors.textSecondary }]}>
                {insight.description}
              </Text>
              {insight.actionLabel && (
                <Text style={[styles.insightAction, { color: theme.colors.primary }]}>
                  → {insight.actionLabel}
                </Text>
              )}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  summaryText: { fontSize: 13, lineHeight: 20, fontFamily: 'monospace' },
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyCard: { padding: 24, borderRadius: 12, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  insightIcon: { fontSize: 24, marginRight: 12, marginTop: 2 },
  insightTitleRow: { flex: 1 },
  insightTitle: { fontSize: 15, fontWeight: '600' },
  insightImpact: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  insightDesc: { fontSize: 13, lineHeight: 18 },
  insightAction: { fontSize: 13, fontWeight: '600', marginTop: 8 },
});
