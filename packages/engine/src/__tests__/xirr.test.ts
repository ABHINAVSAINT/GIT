import { describe, it, expect } from 'vitest';
import { computeXIRR } from '../xirr.js';

describe('computeXIRR', () => {
  it('converges for simple 2-cashflow case', () => {
    const result = computeXIRR([
      { date: new Date('2023-01-01'), amount: -100000 },
      { date: new Date('2024-01-01'), amount: 112000 },
    ]);
    expect(result).toBeCloseTo(0.12, 4);
  });

  it('returns NaN for all-positive cashflows', () => {
    const result = computeXIRR([
      { date: new Date('2023-01-01'), amount: 100 },
      { date: new Date('2024-01-01'), amount: 200 },
    ]);
    expect(result).toBeNaN();
  });

  it('returns NaN for single cashflow', () => {
    const result = computeXIRR([
      { date: new Date('2023-01-01'), amount: -1000 },
    ]);
    expect(result).toBeNaN();
  });

  it('converges for monthly SIP scenario', () => {
    const cashflows = [
      { date: new Date('2023-01-01'), amount: -10000 },
      { date: new Date('2023-02-01'), amount: -10000 },
      { date: new Date('2023-03-01'), amount: -10000 },
      { date: new Date('2023-04-01'), amount: -10000 },
      { date: new Date('2023-05-01'), amount: -10000 },
      { date: new Date('2023-06-01'), amount: -10000 },
      { date: new Date('2023-07-01'), amount: -10000 },
      { date: new Date('2023-08-01'), amount: -10000 },
      { date: new Date('2023-09-01'), amount: -10000 },
      { date: new Date('2023-10-01'), amount: -10000 },
      { date: new Date('2023-11-01'), amount: -10000 },
      { date: new Date('2023-12-01'), amount: -10000 },
      { date: new Date('2024-01-01'), amount: 130000 },
    ];
    const xirr = computeXIRR(cashflows);
    expect(xirr).toBeGreaterThan(0.08);
    expect(xirr).toBeLessThan(0.20);
  });

  it('returns NaN for zero cashflows', () => {
    const result = computeXIRR([
      { date: new Date('2020-01-01'), amount: 0 },
      { date: new Date('2020-06-01'), amount: 0 },
    ]);
    expect(result).toBeNaN();
  });
});
