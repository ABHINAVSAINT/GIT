import { getDatabase } from './database';
import { insertAccount } from './repositories/accountRepository';
import { insertTransaction, insertLinkedTransactions } from './repositories/transactionRepository';
import { insertCategory } from './repositories/categoryRepository';
import type { Account, Transaction, Category } from '@finance/engine';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function seedData(): Promise<void> {
  const db = getDatabase();
  const existing = db.getFirst<{ count: number }>(
    'SELECT COUNT(*) as count FROM accounts'
  );
  if (existing && existing.count > 0) return;

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  // ── Categories ──
  const categories: Category[] = [
    { id: 'cat-salary', name: 'Salary', type: 'income', icon: '💼', color: '#22C55E', isSystem: true, sortOrder: 0 },
    { id: 'cat-freelance', name: 'Freelance', type: 'income', icon: '💻', color: '#10B981', isSystem: true, sortOrder: 1 },
    { id: 'cat-interest', name: 'Interest', type: 'income', icon: '🏦', color: '#059669', isSystem: true, sortOrder: 2 },
    { id: 'cat-dividend', name: 'Dividend', type: 'income', icon: '📈', color: '#34D399', isSystem: true, sortOrder: 3 },
    { id: 'cat-food', name: 'Food & Dining', type: 'expense', icon: '🍕', color: '#F97316', isSystem: true, sortOrder: 0 },
    { id: 'cat-transport', name: 'Transport', type: 'expense', icon: '🚗', color: '#EF4444', isSystem: true, sortOrder: 1 },
    { id: 'cat-shopping', name: 'Shopping', type: 'expense', icon: '🛍️', color: '#EC4899', isSystem: true, sortOrder: 2 },
    { id: 'cat-bills', name: 'Bills & Utilities', type: 'expense', icon: '📱', color: '#8B5CF6', isSystem: true, sortOrder: 3 },
    { id: 'cat-rent', name: 'Rent', type: 'expense', icon: '🏠', color: '#6366F1', isSystem: true, sortOrder: 4 },
    { id: 'cat-health', name: 'Health', type: 'expense', icon: '🏥', color: '#14B8A6', isSystem: true, sortOrder: 5 },
    { id: 'cat-entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', color: '#F43F5E', isSystem: true, sortOrder: 6 },
    { id: 'cat-education', name: 'Education', type: 'expense', icon: '📚', color: '#0EA5E9', isSystem: true, sortOrder: 7 },
    { id: 'cat-transfer', name: 'Transfer', type: 'transfer', icon: '🔄', color: '#64748B', isSystem: true, sortOrder: 0 },
  ];
  for (const cat of categories) {
    await insertCategory(cat);
  }

  // ── Accounts ──
  const accounts: Account[] = [
    { id: 'acc-savings', name: 'HDFC Savings', type: 'savings', currency: 'INR', balance: 24500000, balanceAsOf: now.toISOString(), color: '#0EA5E9', icon: '🏦', isHidden: false, isArchived: false, sortOrder: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'acc-current', name: 'SBI Current', type: 'savings', currency: 'INR', balance: 8200000, balanceAsOf: now.toISOString(), color: '#22C55E', icon: '💳', isHidden: false, isArchived: false, sortOrder: 1, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'acc-credit', name: 'HDFC Credit Card', type: 'credit_card', currency: 'INR', balance: -4750000, balanceAsOf: now.toISOString(), creditLimit: 20000000, statementDay: 15, dueDay: 5, apr: 36, color: '#EF4444', icon: '💳', isHidden: false, isArchived: false, sortOrder: 2, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'acc-cash', name: 'Cash', type: 'cash', currency: 'INR', balance: 320000, balanceAsOf: now.toISOString(), color: '#8B5CF6', icon: '💵', isHidden: false, isArchived: false, sortOrder: 3, createdAt: now.toISOString(), updatedAt: now.toISOString() },
    { id: 'acc-mf', name: 'Groww MF', type: 'investment', currency: 'INR', balance: 58000000, balanceAsOf: now.toISOString(), color: '#F97316', icon: '📈', isHidden: false, isArchived: false, sortOrder: 4, createdAt: now.toISOString(), updatedAt: now.toISOString() },
  ];
  for (const acc of accounts) {
    await insertAccount(acc);
  }

  // ── Transactions (last 3 months) ──
  const transactions: Omit<Transaction, 'id'>[] = [];

  // Generate transactions for last 3 months
  for (let m = 0; m < 3; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // Salary
    transactions.push({ accountId: 'acc-savings', amount: 12500000, currency: 'INR', type: 'income', date: `${prefix}-01`, categoryId: 'cat-salary', description: 'Monthly Salary', status: 'cleared', isRecurring: false, isTaxRelevant: true, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });

    // Rent
    transactions.push({ accountId: 'acc-savings', amount: 2500000, currency: 'INR', type: 'expense', date: `${prefix}-01`, categoryId: 'cat-rent', description: 'House Rent', status: 'cleared', isRecurring: true, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });

    // Food expenses
    const foodAmounts = [45000, 32000, 28000, 55000, 38000, 62000, 41000];
    for (let i = 0; i < foodAmounts.length; i++) {
      const day = String(Math.min(10 + i * 3, 28)).padStart(2, '0');
      transactions.push({ accountId: 'acc-credit', amount: foodAmounts[i], currency: 'INR', type: 'expense', date: `${prefix}-${day}`, categoryId: 'cat-food', merchant: 'Zomato/Swiggy', description: 'Food delivery', status: 'cleared', isRecurring: false, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });
    }

    // Bills
    transactions.push({ accountId: 'acc-savings', amount: 180000, currency: 'INR', type: 'expense', date: `${prefix}-05`, categoryId: 'cat-bills', description: 'Electricity Bill', status: 'cleared', isRecurring: true, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });
    transactions.push({ accountId: 'acc-savings', amount: 120000, currency: 'INR', type: 'expense', date: `${prefix}-05`, categoryId: 'cat-bills', description: 'Internet & Phone', status: 'cleared', isRecurring: true, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });

    // Transport
    transactions.push({ accountId: 'acc-credit', amount: 350000, currency: 'INR', type: 'expense', date: `${prefix}-10`, categoryId: 'cat-transport', description: 'Fuel', status: 'cleared', isRecurring: false, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });

    // Shopping
    if (m === 0) {
      transactions.push({ accountId: 'acc-credit', amount: 850000, currency: 'INR', type: 'expense', date: `${prefix}-15`, categoryId: 'cat-shopping', merchant: 'Amazon', description: 'Electronics purchase', status: 'cleared', isRecurring: false, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });
    }

    // Entertainment
    transactions.push({ accountId: 'acc-credit', amount: 120000, currency: 'INR', type: 'expense', date: `${prefix}-20`, categoryId: 'cat-entertainment', description: 'Movie + Dinner', status: 'cleared', isRecurring: false, isTaxRelevant: false, tags: [], createdAt: now.toISOString(), updatedAt: now.toISOString(), version: 1 });

    // SIP from savings → investment (linked transfer)
    const sipAmount = 1500000;
    const sipDate = `${prefix}-01`;
    const sipId = uuid();
    const sipCounterId = uuid();
    const sipTx: Transaction = {
      id: sipId,
      accountId: 'acc-savings',
      counterpartAccountId: 'acc-mf',
      amount: sipAmount,
      currency: 'INR',
      type: 'transfer',
      date: sipDate,
      categoryId: 'cat-transfer',
      description: 'SIP - Axis Bluechip',
      status: 'cleared',
      isRecurring: true,
      isTaxRelevant: false,
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
    };
    const sipCounterTx: Transaction = {
      id: sipCounterId,
      accountId: 'acc-mf',
      counterpartAccountId: 'acc-savings',
      amount: sipAmount,
      currency: 'INR',
      type: 'transfer',
      date: sipDate,
      categoryId: 'cat-transfer',
      description: 'SIP - Axis Bluechip',
      status: 'cleared',
      isRecurring: true,
      isTaxRelevant: false,
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
    };
    await insertLinkedTransactions(sipTx, sipCounterTx);
  }

  for (const txn of transactions) {
    await insertTransaction({ ...txn, id: uuid() });
  }
}
