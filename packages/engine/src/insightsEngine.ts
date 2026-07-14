import { Transaction, Insight, Category } from './types';

export function generateInsights(
  transactions: Transaction[],
  categories: Category[],
  netWorth: number
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonth = transactions.filter(t => {
    const d = new Date(t.date);
    const lm = currentMonth === 0 ? 11 : currentMonth - 1;
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
    return d.getMonth() === lm && d.getFullYear() === ly;
  });

  const anomaly = detectSpendingAnomaly(thisMonth, lastMonth, categories);
  if (anomaly) insights.push(anomaly);

  const subs = detectSubscriptions(transactions, categories);
  insights.push(...subs);

  const lowBal = checkLowBalance(thisMonth, netWorth);
  if (lowBal) insights.push(lowBal);

  return insights;
}

function detectSpendingAnomaly(
  thisMonth: Transaction[],
  lastMonth: Transaction[],
  categories: Category[]
): Insight | null {
  const thisByCategory = groupByCategory(thisMonth);
  const lastByCategory = groupByCategory(lastMonth);

  for (const [catId, thisAmount] of Object.entries(thisByCategory)) {
    const lastAmount = lastByCategory[catId] ?? 0;
    if (lastAmount <= 0) continue;

    const change = (thisAmount - lastAmount) / lastAmount;
    if (change > 0.4) {
      const cat = categories.find(c => c.id === catId);
      return {
        id: `anomaly-${catId}-${Date.now()}`,
        type: 'spending_anomaly',
        severity: change > 1 ? 'critical' : 'warning',
        title: `${cat?.name ?? 'Unknown'} spending up ${Math.round(change * 100)}%`,
        description: `Spent ₹${(thisAmount / 100).toLocaleString('en-IN')} this month vs ₹${(lastAmount / 100).toLocaleString('en-IN')} last month.`,
        categoryId: catId,
        dismissed: false,
      };
    }
  }

  return null;
}

function detectSubscriptions(
  transactions: Transaction[],
  categories: Category[]
): Insight[] {
  const insights: Insight[] = [];
  const recurring = transactions.filter(t => t.isRecurring && t.type === 'expense');
  const seen = new Set<string>();

  for (const txn of recurring) {
    const key = `${txn.merchant}-${Math.abs(txn.amount)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const cat = categories.find(c => c.id === txn.categoryId);
    insights.push({
      id: `sub-${txn.id}`,
      type: 'subscription_detected',
      severity: 'info',
      title: `Recurring payment: ${txn.merchant ?? 'Unknown'}`,
      description: `₹${(Math.abs(txn.amount) / 100).toLocaleString('en-IN')}/mo — ${cat?.name ?? 'Uncategorized'}`,
      categoryId: txn.categoryId,
      dismissed: false,
    });
  }

  return insights;
}

function checkLowBalance(_transactions: Transaction[], netWorth: number): Insight | null {
  if (netWorth < 0) {
    return {
      id: `low-bal-${Date.now()}`,
      type: 'low_balance',
      severity: 'critical',
      title: 'Negative net worth',
      description: `Your net worth is -₹${(Math.abs(netWorth) / 100).toLocaleString('en-IN')}. Consider reducing expenses.`,
      dismissed: false,
    };
  }
  return null;
}

function groupByCategory(transactions: Transaction[]): Record<string, number> {
  const grouped: Record<string, number> = {};
  for (const t of transactions) {
    if (['expense', 'fee', 'emi_purchase'].includes(t.type)) {
      grouped[t.categoryId] = (grouped[t.categoryId] ?? 0) + Math.abs(t.amount);
    }
  }
  return grouped;
}
