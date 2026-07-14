import { describe, it, expect } from 'vitest';
import {
  calculateSliceMonies,
  calculateAxisSuperMoney,
  calculateCashback,
  getSliceMoniesRedemptionValue,
} from '../cashback.js';
import type { TransactionInput } from '../cashback.js';

describe('Slice Monies', () => {
  const baseTxn: TransactionInput = { amountPaise: 500000 };

  it('earns 1 monies per rupee on eligible spends', () => {
    const result = calculateSliceMonies(baseTxn);
    expect(result.earnedPaise).toBe(500000);
    expect(result.program).toBe('slice_monies');
  });

  it('excludes EMI transactions', () => {
    const result = calculateSliceMonies({ ...baseTxn, isEMI: true });
    expect(result.earnedPaise).toBe(0);
  });

  it('excludes wallet loads', () => {
    const result = calculateSliceMonies({ ...baseTxn, isWalletLoad: true });
    expect(result.earnedPaise).toBe(0);
  });

  it('excludes international transactions', () => {
    const result = calculateSliceMonies({ ...baseTxn, isInternational: true });
    expect(result.earnedPaise).toBe(0);
  });

  it('excludes fuel by MCC', () => {
    const result = calculateSliceMonies({ ...baseTxn, mccCode: '5541' });
    expect(result.earnedPaise).toBe(0);
  });

  it('excludes insurance by MCC', () => {
    const result = calculateSliceMonies({ ...baseTxn, mccCode: '5960' });
    expect(result.earnedPaise).toBe(0);
  });

  it('excludes rent by MCC', () => {
    const result = calculateSliceMonies({ ...baseTxn, mccCode: '6513' });
    expect(result.earnedPaise).toBe(0);
  });

  it('excludes government by MCC', () => {
    const result = calculateSliceMonies({ ...baseTxn, mccCode: '9311' });
    expect(result.earnedPaise).toBe(0);
  });
});

describe('Slice Monies Redemption', () => {
  it('returns 1% for balance up to 3L', () => {
    const r = getSliceMoniesRedemptionValue(100000);
    expect(r.rate).toBe(0.01);
    expect(r.valuePaise).toBe(1000);
  });

  it('returns 1.5% for 3L-5L', () => {
    const r = getSliceMoniesRedemptionValue(400000);
    expect(r.rate).toBe(0.015);
    expect(r.valuePaise).toBe(6000);
  });

  it('returns 2% for above 5L', () => {
    const r = getSliceMoniesRedemptionValue(600000);
    expect(r.rate).toBe(0.02);
    expect(r.valuePaise).toBe(12000);
  });
});

describe('Axis SuperMoney', () => {
  it('gives 1% on non-UPI spends', () => {
    const result = calculateAxisSuperMoney({ amountPaise: 50000 }, 0);
    expect(result.earnedPaise).toBe(500);
  });

  it('gives 3% on super.money UPI capped at other cashback', () => {
    const result = calculateAxisSuperMoney(
      { amountPaise: 50000, isUPI: true, upiApp: 'super.money' },
      800,
    );
    expect(result.earnedPaise).toBe(800);
  });

  it('caps super.money UPI at ₹100 if other cashback < ₹100 and uncapped > ₹100', () => {
    const result = calculateAxisSuperMoney(
      { amountPaise: 500000, isUPI: true, upiApp: 'super.money' },
      50,
    );
    expect(result.earnedPaise).toBe(10000);
  });

  it('gives 0 if other cashback = 0 and uncapped <= ₹100', () => {
    const result = calculateAxisSuperMoney(
      { amountPaise: 50000, isUPI: true, upiApp: 'super.money' },
      0,
    );
    expect(result.earnedPaise).toBe(0);
  });

  it('rejects spends below ₹100', () => {
    const result = calculateAxisSuperMoney({ amountPaise: 5000 }, 0);
    expect(result.earnedPaise).toBe(0);
  });
});

describe('Unified Calculator', () => {
  it('dispatches to slice monies', () => {
    const result = calculateCashback('slice_monies', { amountPaise: 100000 });
    expect(result.earnedPaise).toBe(100000);
  });

  it('dispatches to axis supermoney', () => {
    const result = calculateCashback('axis_supermoney', { amountPaise: 100000 }, 0);
    expect(result.earnedPaise).toBe(1000);
  });
});
