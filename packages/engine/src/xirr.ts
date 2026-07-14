import { Cashflow } from './types';

const MAX_ITERATIONS = 1000;
const TOLERANCE = 1e-7;
const INITIAL_GUESS = 0.1;
const SECANT_SHIFT = 0.001;

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return (b.getTime() - a.getTime()) / msPerDay;
}

function npv(rate: number, cashflows: Cashflow[], reference: Date): number {
  let sum = 0;
  for (const c of cashflows) {
    const years = daysBetween(reference, c.date) / 365;
    sum += c.amount / Math.pow(1 + rate, years);
  }
  return sum;
}

function npvDerivative(rate: number, cashflows: Cashflow[], reference: Date): number {
  let sum = 0;
  for (const c of cashflows) {
    const years = daysBetween(reference, c.date) / 365;
    sum += -years * c.amount / Math.pow(1 + rate, years + 1);
  }
  return sum;
}

export function computeXIRR(cashflows: Cashflow[]): number {
  if (cashflows.length < 2) return NaN;

  const hasPositive = cashflows.some(c => c.amount > 0);
  const hasNegative = cashflows.some(c => c.amount < 0);
  if (!hasPositive || !hasNegative) return NaN;

  const sorted = [...cashflows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const reference = sorted[0]!.date;

  let rate = INITIAL_GUESS;
  let prevRate = rate + SECANT_SHIFT;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const f = npv(rate, sorted, reference);

    if (Math.abs(f) < TOLERANCE) return rate;

    if (i === 0) {
      const fPrime = npvDerivative(rate, sorted, reference);
      if (fPrime === 0) break;
      const newRate = rate - f / fPrime;
      prevRate = rate;
      rate = newRate;
    } else {
      const fPrev = npv(prevRate, sorted, reference);
      const diff = rate - prevRate;
      if (Math.abs(f - fPrev) < 1e-15) break;
      const newRate = rate - f * diff / (f - fPrev);
      prevRate = rate;
      rate = newRate;
    }

    if (!isFinite(rate) || Math.abs(rate) > 10) return NaN;
  }

  return NaN;
}
