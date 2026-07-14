import { create } from 'zustand';
import type { Account, Transaction, Investment } from '@finance/engine';
import { isIncomeType, isExpenseType, isTransferType, isInvestmentType } from '@finance/engine';

interface CashflowSummary {
  income: number;
  expenses: number;
  transfers: number;
  investments: number;
  netSavings: number;
}

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];

  // Derived
  netWorth: number;
  monthlyCashflow: CashflowSummary;

  // Actions
  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setInvestments: (investments: Investment[]) => void;
  addTransaction: (txn: Transaction, sourceDelta?: number, counterpartAccountId?: string, counterDelta?: number) => void;
  hydrate: (data: {
    accounts: Account[];
    transactions: Transaction[];
    investments: Investment[];
  }) => void;
}

function computeNetWorth(accounts: Account[]): number {
  return accounts
    .filter(a => !a.isHidden)
    .reduce((sum, a) => sum + a.balance, 0);
}

function computeMonthlyCashflow(transactions: Transaction[]): CashflowSummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let income = 0;
  let expenses = 0;
  let transfers = 0;
  let investments = 0;

  for (const t of transactions) {
    const txnDate = new Date(t.date);
    if (txnDate < monthStart) continue;

    if (isIncomeType(t.type)) {
      income += t.amount;
    } else if (isExpenseType(t.type)) {
      expenses += Math.abs(t.amount);
    } else if (isTransferType(t.type)) {
      transfers += Math.abs(t.amount);
    } else if (isInvestmentType(t.type)) {
      investments += Math.abs(t.amount);
    }
  }

  return { income, expenses, transfers, investments, netSavings: income - expenses };
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  accounts: [],
  transactions: [],
  investments: [],
  netWorth: 0,
  monthlyCashflow: { income: 0, expenses: 0, transfers: 0, investments: 0, netSavings: 0 },

  setAccounts: (accounts) => set({
    accounts,
    netWorth: computeNetWorth(accounts),
  }),

  setTransactions: (transactions) => set({
    transactions,
    monthlyCashflow: computeMonthlyCashflow(transactions),
  }),

  setInvestments: (investments) => set({ investments }),

  addTransaction: (txn, sourceDelta?: number, counterpartAccountId?: string, counterDelta?: number) => {
    const { transactions, accounts } = get();
    const updated = [txn, ...transactions];

    const updatedAccounts = accounts.map(a => {
      if (a.id === txn.accountId && sourceDelta != null) {
        return { ...a, balance: a.balance + sourceDelta };
      }
      if (counterpartAccountId && a.id === counterpartAccountId && counterDelta != null) {
        return { ...a, balance: a.balance + counterDelta };
      }
      return a;
    });

    set({
      transactions: updated,
      accounts: updatedAccounts,
      netWorth: computeNetWorth(updatedAccounts),
      monthlyCashflow: computeMonthlyCashflow(updated),
    });
  },

  hydrate: (data) => set({
    accounts: data.accounts,
    transactions: data.transactions,
    investments: data.investments,
    netWorth: computeNetWorth(data.accounts),
    monthlyCashflow: computeMonthlyCashflow(data.transactions),
  }),
}));
