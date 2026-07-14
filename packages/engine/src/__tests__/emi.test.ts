import { describe, it, expect } from 'vitest';
import { calculateEMI, generateAmortizationSchedule, sipFutureValue } from '../emi.js';

describe('calculateEMI', () => {
  it('calculates EMI for standard home loan', () => {
    const emi = calculateEMI(5000000, 0.09, 240);
    expect(emi).toBeGreaterThan(44000);
    expect(emi).toBeLessThan(46000);
  });

  it('handles zero interest', () => {
    const emi = calculateEMI(120000, 0, 12);
    expect(emi).toBe(10000);
  });
});

describe('generateAmortizationSchedule', () => {
  it('produces correct number of rows', () => {
    const schedule = generateAmortizationSchedule(100000, 0.10, 12);
    expect(schedule.length).toBe(12);
  });

  it('closing balance is zero at end', () => {
    const schedule = generateAmortizationSchedule(100000, 0.10, 12);
    expect(schedule[schedule.length - 1]!.closingBalance).toBe(0);
  });
});

describe('sipFutureValue', () => {
  it('matches known SIP return', () => {
    const result = sipFutureValue(10000, 0.12, 12);
    expect(result).toBeGreaterThan(126000);
    expect(result).toBeLessThan(130000);
  });
});
