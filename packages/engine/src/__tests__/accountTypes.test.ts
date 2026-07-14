import { describe, it, expect } from 'vitest';
import {
  getTransactionTypesForAccount,
  computeBalanceDelta,
  isIncomeType,
  isExpenseType,
  isTransferType,
  isInvestmentType,
} from '../types.js';

describe('getTransactionTypesForAccount', () => {
  it('savings account allows income, expense, transfer, interest', () => {
    const types = getTransactionTypesForAccount('savings');
    expect(types.map(t => t.type)).toEqual(['income', 'expense', 'transfer', 'interest']);
  });

  it('checking account allows income, expense, transfer, interest', () => {
    const types = getTransactionTypesForAccount('checking');
    expect(types.map(t => t.type)).toEqual(['income', 'expense', 'transfer', 'interest']);
  });

  it('credit card allows spend, pay bill, refund', () => {
    const types = getTransactionTypesForAccount('credit_card');
    expect(types.map(t => t.type)).toEqual(['expense', 'transfer', 'income']);
    expect(types[0].label).toBe('Spend');
    expect(types[1].label).toBe('Pay Bill');
    expect(types[2].label).toBe('Refund');
  });

  it('credit card pay bill requires counterpart from savings/checking/cash only', () => {
    const types = getTransactionTypesForAccount('credit_card');
    const payBill = types.find(t => t.type === 'transfer');
    expect(payBill?.requiresCounterpart).toBe(true);
    expect(payBill?.counterpartFilter).toEqual(['savings', 'checking', 'cash']);
  });

  it('credit card spend does not require counterpart', () => {
    const types = getTransactionTypesForAccount('credit_card');
    const spend = types.find(t => t.label === 'Spend');
    expect(spend?.requiresCounterpart).toBeFalsy();
  });

  it('emi card allows emi_purchase and emi_payment', () => {
    const types = getTransactionTypesForAccount('emi_card');
    expect(types.map(t => t.type)).toEqual(['emi_purchase', 'emi_payment']);
    expect(types[0].label).toBe('EMI Purchase');
    expect(types[1].label).toBe('EMI Payment');
  });

  it('emi card emi_purchase has emiTenure field', () => {
    const types = getTransactionTypesForAccount('emi_card');
    const purchase = types.find(t => t.type === 'emi_purchase');
    expect(purchase?.fields).toContain('emiTenure');
  });

  it('emi card emi_payment requires counterpart', () => {
    const types = getTransactionTypesForAccount('emi_card');
    const payment = types.find(t => t.type === 'emi_payment');
    expect(payment?.requiresCounterpart).toBe(true);
    expect(payment?.counterpartFilter).toEqual(['savings', 'checking', 'cash']);
  });

  it('investment allows buy, sell, dividend, interest', () => {
    const types = getTransactionTypesForAccount('investment');
    expect(types.map(t => t.type)).toEqual(['investment', 'redemption', 'dividend', 'interest']);
  });

  it('investment buy has units and navOrPrice fields', () => {
    const types = getTransactionTypesForAccount('investment');
    const buy = types.find(t => t.type === 'investment');
    expect(buy?.fields).toContain('units');
    expect(buy?.fields).toContain('navOrPrice');
  });

  it('fixed_deposit allows fd_create and fd_mature', () => {
    const types = getTransactionTypesForAccount('fixed_deposit');
    expect(types.map(t => t.type)).toEqual(['fd_create', 'fd_mature']);
    expect(types[0].label).toBe('Create FD');
    expect(types[1].label).toBe('FD Mature');
  });

  it('fixed deposit fd_create has fdRate and fdMaturityDate fields', () => {
    const types = getTransactionTypesForAccount('fixed_deposit');
    const create = types.find(t => t.type === 'fd_create');
    expect(create?.fields).toContain('fdRate');
    expect(create?.fields).toContain('fdMaturityDate');
  });

  it('fixed deposit fd_mature requires counterpart from savings/checking', () => {
    const types = getTransactionTypesForAccount('fixed_deposit');
    const mature = types.find(t => t.type === 'fd_mature');
    expect(mature?.requiresCounterpart).toBe(true);
    expect(mature?.counterpartFilter).toEqual(['savings', 'checking']);
  });

  it('cash allows receive, spend, transfer', () => {
    const types = getTransactionTypesForAccount('cash');
    expect(types.map(t => t.type)).toEqual(['income', 'expense', 'transfer']);
    expect(types[0].label).toBe('Receive');
    expect(types[1].label).toBe('Spend');
  });

  it('unknown account type returns default income/expense/transfer', () => {
    const types = getTransactionTypesForAccount('other' as any);
    expect(types.map(t => t.type)).toEqual(['income', 'expense', 'transfer']);
  });

  it('savings account allows interest type', () => {
    const types = getTransactionTypesForAccount('savings');
    const interest = types.find(t => t.type === 'interest');
    expect(interest).toBeDefined();
    expect(interest?.label).toBe('Interest');
    expect(interest?.fields).toContain('interestRate');
  });

  it('checking account allows interest type', () => {
    const types = getTransactionTypesForAccount('checking');
    const interest = types.find(t => t.type === 'interest');
    expect(interest).toBeDefined();
    expect(interest?.label).toBe('Interest');
    expect(interest?.fields).toContain('interestRate');
  });
});

describe('computeBalanceDelta', () => {
  it('savings income increases balance', () => {
    expect(computeBalanceDelta('savings', 'income', 50000)).toBe(50000);
  });

  it('savings expense decreases balance', () => {
    expect(computeBalanceDelta('savings', 'expense', 20000)).toBe(-20000);
  });

  it('savings transfer decreases balance', () => {
    expect(computeBalanceDelta('savings', 'transfer', 10000)).toBe(-10000);
  });

  it('checking income increases balance', () => {
    expect(computeBalanceDelta('checking', 'income', 30000)).toBe(30000);
  });

  it('checking expense decreases balance', () => {
    expect(computeBalanceDelta('checking', 'expense', 5000)).toBe(-5000);
  });

  it('CC spend increases debt (positive)', () => {
    expect(computeBalanceDelta('credit_card', 'expense', 25000)).toBe(25000);
  });

  it('CC payment decreases debt (negative)', () => {
    expect(computeBalanceDelta('credit_card', 'transfer', 15000)).toBe(-15000);
  });

  it('CC refund decreases debt (negative via income type on CC)', () => {
    expect(computeBalanceDelta('credit_card', 'income', 5000)).toBe(-5000);
  });

  it('EMI purchase increases outstanding (positive)', () => {
    expect(computeBalanceDelta('emi_card', 'emi_purchase', 12000)).toBe(12000);
  });

  it('EMI payment decreases outstanding (negative)', () => {
    expect(computeBalanceDelta('emi_card', 'emi_payment', 2000)).toBe(-2000);
  });

  it('investment buy decreases cash (negative)', () => {
    expect(computeBalanceDelta('investment', 'investment', 5000)).toBe(-5000);
  });

  it('investment sell increases cash (positive)', () => {
    expect(computeBalanceDelta('investment', 'redemption', 10000)).toBe(10000);
  });

  it('dividend is income (positive)', () => {
    expect(computeBalanceDelta('investment', 'dividend', 500)).toBe(500);
  });

  it('interest is income (positive)', () => {
    expect(computeBalanceDelta('investment', 'interest', 300)).toBe(300);
  });

  it('FD create decreases savings (negative)', () => {
    expect(computeBalanceDelta('fixed_deposit', 'fd_create', 10000)).toBe(-10000);
  });

  it('FD maturity increases savings (positive)', () => {
    expect(computeBalanceDelta('fixed_deposit', 'fd_mature', 10775)).toBe(10775);
  });

  it('cash income increases balance', () => {
    expect(computeBalanceDelta('cash', 'income', 1650)).toBe(1650);
  });

  it('cash expense decreases balance', () => {
    expect(computeBalanceDelta('cash', 'expense', 500)).toBe(-500);
  });

  it('fee is always negative', () => {
    expect(computeBalanceDelta('savings', 'fee', 100)).toBe(-100);
    expect(computeBalanceDelta('credit_card', 'fee', 100)).toBe(-100);
  });

  it('unknown type returns 0', () => {
    expect(computeBalanceDelta('savings', 'something' as any, 1000)).toBe(0);
  });

  it('direction incoming reverses the sign', () => {
    expect(computeBalanceDelta('savings', 'transfer', 10000, 'incoming')).toBe(10000);
    expect(computeBalanceDelta('savings', 'income', 10000, 'incoming')).toBe(-10000);
    expect(computeBalanceDelta('savings', 'expense', 10000, 'incoming')).toBe(10000);
    expect(computeBalanceDelta('credit_card', 'transfer', 15000, 'incoming')).toBe(15000);
    expect(computeBalanceDelta('credit_card', 'expense', 15000, 'incoming')).toBe(-15000);
  });

  it('CC refund direction: outgoing decreases CC balance, incoming increases savings', () => {
    expect(computeBalanceDelta('credit_card', 'income', 5000, 'outgoing')).toBe(-5000);
    expect(computeBalanceDelta('credit_card', 'income', 5000, 'incoming')).toBe(5000);
  });

  it('linked transfer: CC payment updates both sides correctly', () => {
    const ccDelta = computeBalanceDelta('credit_card', 'transfer', 15000, 'outgoing');
    const bankDelta = computeBalanceDelta('savings', 'transfer', 15000, 'incoming');
    expect(ccDelta).toBe(-15000);
    expect(bankDelta).toBe(15000);
  });

  it('linked transfer: savings to savings', () => {
    const sourceDelta = computeBalanceDelta('savings', 'transfer', 10000, 'outgoing');
    const destDelta = computeBalanceDelta('savings', 'transfer', 10000, 'incoming');
    expect(sourceDelta).toBe(-10000);
    expect(destDelta).toBe(10000);
  });

  it('default direction is outgoing', () => {
    expect(computeBalanceDelta('savings', 'transfer', 5000)).toBe(-5000);
    expect(computeBalanceDelta('savings', 'transfer', 5000, 'outgoing')).toBe(-5000);
  });
});

describe('cashflow classification', () => {
  it('income types', () => {
    expect(isIncomeType('income')).toBe(true);
    expect(isIncomeType('dividend')).toBe(true);
    expect(isIncomeType('interest')).toBe(true);
    expect(isIncomeType('expense')).toBe(false);
    expect(isIncomeType('transfer')).toBe(false);
  });

  it('expense types', () => {
    expect(isExpenseType('expense')).toBe(true);
    expect(isExpenseType('fee')).toBe(true);
    expect(isExpenseType('emi_purchase')).toBe(true);
    expect(isExpenseType('income')).toBe(false);
    expect(isExpenseType('transfer')).toBe(false);
  });

  it('transfer types', () => {
    expect(isTransferType('transfer')).toBe(true);
    expect(isTransferType('emi_payment')).toBe(true);
    expect(isTransferType('fd_create')).toBe(true);
    expect(isTransferType('fd_mature')).toBe(true);
    expect(isTransferType('expense')).toBe(false);
    expect(isTransferType('income')).toBe(false);
  });

  it('investment types', () => {
    expect(isInvestmentType('investment')).toBe(true);
    expect(isInvestmentType('redemption')).toBe(true);
    expect(isInvestmentType('income')).toBe(false);
    expect(isInvestmentType('expense')).toBe(false);
  });

  it('interest is classified as income type', () => {
    expect(isIncomeType('interest')).toBe(true);
  });

  it('interest balance delta is positive for savings', () => {
    expect(computeBalanceDelta('savings', 'interest', 350)).toBe(350);
  });

  it('interest balance delta is positive for checking', () => {
    expect(computeBalanceDelta('checking', 'interest', 500)).toBe(500);
  });
});
