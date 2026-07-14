import { getDatabase } from '../database';
import type { Transaction } from '@finance/engine';

export async function getAllTransactions(limit = 100): Promise<Transaction[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    `SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY date DESC LIMIT ?`,
    [limit]
  );
  return rows.map(mapRow);
}

export async function getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    `SELECT * FROM transactions WHERE account_id = ? AND is_deleted = 0 ORDER BY date DESC`,
    [accountId]
  );
  return rows.map(mapRow);
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? AND is_deleted = 0 ORDER BY date DESC`,
    [startDate, endDate]
  );
  return rows.map(mapRow);
}

export async function insertTransaction(tx: Transaction): Promise<void> {
  const db = getDatabase();
  db.execute(
    `INSERT INTO transactions (id, account_id, counterpart_account_id, amount, currency, type, date,
      posted_date, category_id, subcategory_id, tags, merchant, description, notes,
      receipt_image_uri, recurring_rule_id, investment_id, units, nav_or_price,
      status, is_recurring, is_tax_relevant, is_deleted, version,
      cashback_paise, cashback_program, cashback_description,
      emi_tenure, emi_number, fd_rate, fd_maturity_date, interest_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id, tx.accountId, tx.counterpartAccountId ?? null,
      tx.amount, tx.currency, tx.type, tx.date,
      tx.postedDate ?? null, tx.categoryId, tx.subcategoryId ?? null,
      JSON.stringify(tx.tags ?? []), tx.merchant ?? null,
      tx.description, tx.notes ?? null,
      tx.receiptImageUri ?? null, tx.recurringRuleId ?? null,
      tx.investmentId ?? null, tx.units ?? null, tx.navOrPrice ?? null,
      tx.status, tx.isRecurring ? 1 : 0, tx.isTaxRelevant ? 1 : 0,
      tx.cashbackPaise ?? null, tx.cashbackProgram ?? null, tx.cashbackDescription ?? null,
      tx.emiTenure ?? null, tx.emiNumber ?? null, tx.fdRate ?? null, tx.fdMaturityDate ?? null,
      tx.interestRate ?? null,
    ]
  );
}

export async function insertTransactionAndBalance(
  tx: Transaction,
  deltaPaise: number
): Promise<void> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  db.transaction(() => {
    insertTransactionRaw(db, tx);
    if (deltaPaise !== 0) {
      db.execute(
        `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
        [deltaPaise, today, tx.accountId]
      );
    }
  });
}

export async function insertLinkedTransactions(primary: Transaction, counterpart: Transaction): Promise<void> {
  const db = getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, primary);
    insertTransactionRaw(db, counterpart);
  });
}

function insertTransactionRaw(db: any, tx: Transaction): void {
  db.execute(
    `INSERT INTO transactions (id, account_id, counterpart_account_id, amount, currency, type, date,
      posted_date, category_id, subcategory_id, tags, merchant, description, notes,
      receipt_image_uri, recurring_rule_id, investment_id, units, nav_or_price,
      status, is_recurring, is_tax_relevant, is_deleted, version,
      cashback_paise, cashback_program, cashback_description,
      emi_tenure, emi_number, fd_rate, fd_maturity_date, interest_rate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tx.id, tx.accountId, tx.counterpartAccountId ?? null,
      tx.amount, tx.currency, tx.type, tx.date,
      tx.postedDate ?? null, tx.categoryId, tx.subcategoryId ?? null,
      JSON.stringify(tx.tags ?? []), tx.merchant ?? null,
      tx.description, tx.notes ?? null,
      tx.receiptImageUri ?? null, tx.recurringRuleId ?? null,
      tx.investmentId ?? null, tx.units ?? null, tx.navOrPrice ?? null,
      tx.status, tx.isRecurring ? 1 : 0, tx.isTaxRelevant ? 1 : 0,
      tx.cashbackPaise ?? null, tx.cashbackProgram ?? null, tx.cashbackDescription ?? null,
      tx.emiTenure ?? null, tx.emiNumber ?? null, tx.fdRate ?? null, tx.fdMaturityDate ?? null,
      tx.interestRate ?? null,
    ]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = getDatabase();
  db.execute(
    `UPDATE transactions SET is_deleted = 1, deleted_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

export async function getMonthlyCashflow(year: number, month: number): Promise<{ income: number; expenses: number; netSavings: number }> {
  const db = getDatabase();
  const monthStr = String(month).padStart(2, '0');
  const datePrefix = `${year}-${monthStr}`;

  const income = db.getFirst<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE type IN ('income', 'dividend', 'interest') AND date LIKE ? AND is_deleted = 0`,
    [`${datePrefix}%`]
  );

  const expenses = db.getFirst<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM transactions
     WHERE type IN ('expense', 'fee', 'emi_purchase') AND date LIKE ? AND is_deleted = 0`,
    [`${datePrefix}%`]
  );

  return {
    income: income?.total ?? 0,
    expenses: expenses?.total ?? 0,
    netSavings: (income?.total ?? 0) - (expenses?.total ?? 0),
  };
}

function mapRow(row: any): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    counterpartAccountId: row.counterpart_account_id ?? undefined,
    amount: row.amount,
    currency: row.currency,
    type: row.type,
    date: row.date,
    postedDate: row.posted_date ?? undefined,
    categoryId: row.category_id,
    subcategoryId: row.subcategory_id ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    merchant: row.merchant ?? undefined,
    description: row.description,
    notes: row.notes ?? undefined,
    receiptImageUri: row.receipt_image_uri ?? undefined,
    recurringRuleId: row.recurring_rule_id ?? undefined,
    investmentId: row.investment_id ?? undefined,
    units: row.units ?? undefined,
    navOrPrice: row.nav_or_price ?? undefined,
    status: row.status,
    isRecurring: row.is_recurring === 1,
    isTaxRelevant: row.is_tax_relevant === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    cashbackPaise: row.cashback_paise ?? undefined,
    cashbackProgram: row.cashback_program ?? undefined,
    cashbackDescription: row.cashback_description ?? undefined,
    emiTenure: row.emi_tenure ?? undefined,
    emiNumber: row.emi_number ?? undefined,
    fdRate: row.fd_rate ?? undefined,
    fdMaturityDate: row.fd_maturity_date ?? undefined,
    interestRate: row.interest_rate ?? undefined,
  };
}
