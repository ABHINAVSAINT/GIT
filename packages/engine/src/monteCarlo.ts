export interface MonteCarloInput {
  currentAmount: number;
  monthlyContribution: number;
  expectedReturn: number;       // Annual decimal
  volatility: number;           // Annual standard deviation
  years: number;
  target?: number;              // For probabilityOfSuccess computation
  stepUpPercent?: number;
  stepUpMonth?: number;
}

export interface MonteCarloResult {
  median: number;
  percentile10: number;
  percentile25: number;
  percentile75: number;
  percentile90: number;
  probabilityOfSuccess: number; // P(amount >= target)
  simulations: number[];
}

export function determineRequiredContribution(
  target: number,
  currentAmount: number,
  expectedReturn: number,
  years: number,
  _currentMonthly: number = 0,
  stepUpPercent: number = 0,
  stepUpMonth: number = 12
): number {
  if (years <= 0) return 0;

  const monthlyReturn = expectedReturn / 12;
  const totalMonths = years * 12;

  let low = 0;
  let high = target;
  let mid = 0;
  let result: number | null = null;

  for (let i = 0; i < 100; i++) {
    mid = (low + high) / 2;
    const projected = projectFutureValue(currentAmount, mid, monthlyReturn, totalMonths, stepUpPercent, stepUpMonth);

    if (Math.abs(projected - target) < 1) {
      result = mid;
      break;
    }

    if (projected < target) {
      low = mid;
    } else {
      high = mid;
      result = mid;
    }
  }

  return Math.round(result ?? mid);
}

function projectFutureValue(
  current: number,
  monthly: number,
  monthlyReturn: number,
  months: number,
  stepUpPct: number,
  stepUpMonth: number
): number {
  let total = current;
  let currentMonthly = monthly;

  for (let m = 0; m < months; m++) {
    total = (total + currentMonthly) * (1 + monthlyReturn);

    if (stepUpPct > 0 && (m + 1) % stepUpMonth === 0) {
      currentMonthly = Math.round(currentMonthly * (1 + stepUpPct / 100));
    }
  }

  return Math.round(total);
}

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const { currentAmount, monthlyContribution, expectedReturn, volatility, years } = input;
  const numSimulations = 5000;
  const monthlyReturn = expectedReturn / 12;
  const monthlyVol = volatility / Math.sqrt(12);

  const finalValues: number[] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    let value = currentAmount;
    let currentMonthly = monthlyContribution;
    const totalMonths = years * 12;

    for (let m = 0; m < totalMonths; m++) {
      const randomReturn = monthlyReturn + monthlyVol * gaussianRandom();
      value = (value + currentMonthly) * (1 + randomReturn);

      if (input.stepUpPercent && input.stepUpMonth && (m + 1) % input.stepUpMonth === 0) {
        currentMonthly = Math.round(currentMonthly * (1 + input.stepUpPercent / 100));
      }
    }

    finalValues.push(Math.round(value));
  }

  finalValues.sort((a, b) => a - b);

  return {
    median: percentile(finalValues, 50),
    percentile10: percentile(finalValues, 10),
    percentile25: percentile(finalValues, 25),
    percentile75: percentile(finalValues, 75),
    percentile90: percentile(finalValues, 90),
    probabilityOfSuccess: input.target != null
      ? finalValues.filter(v => v >= input.target!).length / finalValues.length
      : 1,
    simulations: finalValues.slice(0, 100),
  };
}

function percentile(sorted: number[], p: number): number {
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))]!;
}

function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
