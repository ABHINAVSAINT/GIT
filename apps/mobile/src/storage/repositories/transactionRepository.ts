import { getDatabase } from '../database';
import type { Transaction } from '@finance/engine';
import type { DB } from '../database';

export async function getAllTransactions(limit = 100): Promise<Transaction[]> {
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE is_deleted = 0 ORDER BY date DESC LIMIT ?`,
    [limit]
  );
  return rows.map(mapRow);
}

export async function getTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE account_id = ? AND is_deleted = 0 ORDER BY date DESC`,
    [accountId]
  );
  return rows.map(mapRow);
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? AND is_deleted = 0 ORDER BY date DESC`,
    [startDate, endDate]
  );
  return rows.map(mapRow);
}

// Insert raw SQL - exported for use by transactionService to avoid duplication
export function insertTransactionRaw(db: DB, tx: Transaction): void {
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

export async function insertTransaction(tx: Transaction): Promise<void> {
  const db = await getDatabase();
  insertTransactionRaw(db, tx);
}

export async function insertTransactionAndBalance(
  tx: Transaction,
  deltaPaise: number
): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().slice(0, 10);
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
  const db = await getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, primary);
    insertTransactionRaw(db, counterpart);
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDatabase();
  db.execute(
    `UPDATE transactions SET is_deleted = 1, deleted_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

export async function getMonthlyCashflow(year: number, month: number): Promise<{ income: number; expenses: number; netSavings: number }> {
  const db = await getDatabase();
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

function mapRow(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    counterpartAccountId: row.counterpart_account_id ? (row.counterpart_account_id as string) : undefined,
    amount: row.amount as number,
    currency: row.currency as string,
    type: row.type as Transaction['type'],
    date: row.date as string,
    postedDate: row.posted_date ? (row.posted_date as string) : undefined,
    categoryId: row.category_id as string,
    subcategoryId: row.subcategory_id ? (row.subcategory_id as string) : undefined,
    tags: row.tags ? JSON.parse(row.tags as string) : [],
    merchant: row.merchant ? (row.merchant as string) : undefined,
    description: row.description as string,
    notes: row.notes ? (row.notes as string) : undefined,
    receiptImageUri: row.receipt_image_uri ? (row.receipt_image_uri as string) : undefined,
    recurringRuleId: row.recurring_rule_id ? (row.recurring_rule_id as string) : undefined,
    investmentId: row.investment_id ? (row.investment_id as string) : undefined,
    units: row.units ? (row.units as number) : undefined,
    navOrPrice: row.nav_or_price ? (row.nav_or_price as number) : undefined,
    status: row.status as Transaction['status'],
    isRecurring: (row.is_recurring as number) === 1,
    isTaxRelevant: (row.is_tax_relevant as number) === 1,
    createdAt: row.created_at ? (row.created_at as string) : undefined,
    updatedAt: row.updated_at ? (row.updated_at as string) : undefined,
    version: row.version as number,
    cashbackPaise: row.cashback_paise ? (row.cashback_paise as number) : undefined,
    cashbackProgram: row.cashback_program ? (row.cashback_program as string) : undefined,
    cashbackDescription: row.cashback_description ? (row.cashback_description as string) : undefined,
    emiTenure: row.emi_tenure ? (row.emi_tenure as number) : undefined,
    emiNumber: row.emi_number ? (row.emi_number as number) : undefined,
    fdRate: row.fd_rate ? (row.fd_rate as number) : undefined,
    fdMaturityDate: row.fd_maturity_date ? (row.fd_maturity_date as string) : undefined,
    interestRate: row.interest_rate ? (row.interest_rate as number) : undefined,
  };
}
