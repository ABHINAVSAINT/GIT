import { AmortizationRow } from './types';

export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return Math.round(principal / tenureMonths);

  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  return Math.round(principal * monthlyRate * factor / (factor - 1));
}

export function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDate: Date = new Date()
): AmortizationRow[] {
  const monthlyRate = annualRate / 12;
  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const rows: AmortizationRow[] = [];

  let balance = principal;
  for (let month = 1; month <= tenureMonths; month++) {
    const interest = Math.round(balance * monthlyRate);
    const principalPaid = emi - interest;
    const openingBalance = balance;
    balance = Math.max(0, balance - principalPaid);

    const date = new Date(startDate);
    date.setMonth(date.getMonth() + month);

    rows.push({
      month,
      date: date.toISOString().slice(0, 10),
      openingBalance,
      emi,
      interest,
      principal: principalPaid,
      closingBalance: balance,
    });

    if (balance <= 0) break;
  }

  return rows;
}

export function sipFutureValue(
  monthlyAmount: number,
  annualReturn: number,
  months: number,
  stepUpPercent: number = 0,
  stepUpMonth: number = 12
): number {
  let total = 0;
  const monthlyReturn = annualReturn / 12;
  let currentSip = monthlyAmount;

  for (let m = 1; m <= months; m++) {
    total = (total + currentSip) * (1 + monthlyReturn);

    if (stepUpPercent > 0 && m % stepUpMonth === 0) {
      currentSip = Math.round(currentSip * (1 + stepUpPercent / 100));
    }
  }

  return Math.round(total);
}

export function compoundInterest(
  principal: number,
  annualRate: number,
  years: number,
  compounding: 'yearly' | 'quarterly' | 'monthly' = 'yearly'
): number {
  const n = compounding === 'monthly' ? 12 : compounding === 'quarterly' ? 4 : 1;
  const amount = principal * Math.pow(1 + annualRate / n, n * years);
  return Math.round(amount);
}
