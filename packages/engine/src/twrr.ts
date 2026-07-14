import { Cashflow } from './types';

interface ValuationPeriod {
  startValue: number;
  endValue: number;
  cashflows: Cashflow[];
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return (b.getTime() - a.getTime()) / msPerDay;
}

function periodReturn(period: ValuationPeriod): number {
  let numerator = period.endValue;
  for (const cf of period.cashflows) {
    if (cf.amount > 0) numerator -= cf.amount;
  }
  const denominator = period.startValue;
  return numerator / denominator - 1;
}

export function computeTWRR(periods: ValuationPeriod[]): number {
  if (periods.length === 0) return 0;

  let cumulativeReturn = 1;
  for (const period of periods) {
    cumulativeReturn *= 1 + periodReturn(period);
  }

  const totalDays = periods.reduce((sum, p) => {
    if (p.cashflows.length > 0) {
      const firstDate = p.cashflows.reduce((earliest, cf) =>
        cf.date < earliest ? cf.date : earliest, p.cashflows[0]!.date
      );
      return sum + daysBetween(firstDate, new Date());
    }
    return sum;
  }, 0);

  if (totalDays < 1) return 0;

  return Math.pow(cumulativeReturn, 365 / totalDays) - 1;
}
