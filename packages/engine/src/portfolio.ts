import { Investment, PortfolioMetrics, Cashflow } from './types';
import { computeXIRR } from './xirr';

export function computePortfolioMetrics(investments: Investment[]): PortfolioMetrics {
  const active = investments.filter(i => i.quantity > 0);

  const totalInvested = active.reduce((sum, i) => sum + i.investedAmount, 0);
  const currentValue = active.reduce((sum, i) => sum + i.currentValue, 0);
  const unrealizedGain = currentValue - totalInvested;
  const unrealizedGainPct = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0;

  const cashflows = buildPortfolioCashflows(active);
  const xirr = cashflows.length >= 2 ? computeXIRR(cashflows) : NaN;

  const totalDividends = active.reduce((sum, i) => sum + i.totalDividends, 0);
  const absoluteReturn = unrealizedGain + totalDividends;
  const annualizedReturn = computeAnnualizedReturn(active, absoluteReturn);

  const totalValue = currentValue || 1;
  const topHoldings = [...active]
    .sort((a, b) => b.currentValue - a.currentValue)
    .slice(0, 5)
    .map(i => ({
      name: i.name,
      value: i.currentValue,
      weight: i.currentValue / totalValue,
    }));

  const allocation: Record<string, number> = {};
  for (const inv of active) {
    allocation[inv.type] = (allocation[inv.type] ?? 0) + inv.currentValue;
  }
  for (const key of Object.keys(allocation)) {
    allocation[key] = allocation[key]! / totalValue;
  }

  return {
    totalInvested,
    currentValue,
    unrealizedGain,
    unrealizedGainPct,
    xirr,
    absoluteReturn,
    annualizedReturn,
    topHoldings,
    allocation,
  };
}

function buildPortfolioCashflows(investments: Investment[]): Cashflow[] {
  const cashflows: Cashflow[] = [];

  for (const inv of investments) {
    cashflows.push({
      date: new Date(inv.createdAt),
      amount: -inv.investedAmount / 100,
    });
    cashflows.push({
      date: new Date(),
      amount: inv.currentValue / 100,
    });
  }

  return cashflows;
}

function computeAnnualizedReturn(investments: Investment[], absoluteReturn: number): number {
  const totalInvested = investments.reduce((sum, i) => sum + i.investedAmount, 0);
  if (totalInvested <= 0) return 0;

  const now = Date.now();
  let totalYears = 0;
  let count = 0;

  for (const inv of investments) {
    const start = new Date(inv.createdAt).getTime();
    const years = (now - start) / (365 * 86400000);
    if (years >= 1) {
      totalYears += years;
      count++;
    }
  }

  if (count === 0) return 0;
  const avgYears = totalYears / count;
  const totalReturn = totalInvested + absoluteReturn;
  return Math.pow(totalReturn / totalInvested, 1 / avgYears) - 1;
}
