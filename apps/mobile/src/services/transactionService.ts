import { getDatabase } from '../storage/database';
import type { Transaction } from '@finance/engine';

/**
 * Transaction Service
 * Orchestrates multi-step transaction operations atomically.
 * All operations use db.transaction() for data integrity.
 */

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

function updateBalanceRaw(db: any, accountId: string, deltaPaise: number): void {
  const today = new Date().toISOString().split('T')[0];
  db.execute(
    `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
    [deltaPaise, today, accountId]
  );
}

/**
 * Create a single transaction with balance update (income, expense, fee, interest, dividend)
 */
export async function createSingleTransaction(
  tx: Transaction,
  deltaPaise: number
): Promise<void> {
  const db = await getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, tx);
    if (deltaPaise !== 0) {
      updateBalanceRaw(db, tx.accountId, deltaPaise);
    }
  });
}

/**
 * Create a linked transfer (two transactions, two balance updates)
 * Used for: CC pay bill, FD create/mature, EMI payment, savings transfer
 */
export async function createLinkedTransfer(
  primary: Transaction,
  counterpart: Transaction,
  primaryDelta: number,
  counterpartDelta: number
): Promise<void> {
  const db = await getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, primary);
    insertTransactionRaw(db, counterpart);
    updateBalanceRaw(db, primary.accountId, primaryDelta);
    updateBalanceRaw(db, counterpart.accountId, counterpartDelta);
  });
}

/**
 * Create an investment purchase (transaction + account balance + investment record)
 */
export async function createInvestmentPurchase(
  tx: Transaction,
  investmentId: string,
  units: number,
  nav: number
): Promise<void> {
  const db = await getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, tx);
    updateBalanceRaw(db, tx.accountId, -tx.amount);
    db.execute(
      `UPDATE investments SET quantity = quantity + ?, average_cost = ?, invested_amount = invested_amount + ? WHERE id = ?`,
      [units, nav, tx.amount, investmentId]
    );
  });
}

/**
 * Create an investment redemption (transaction + account balance + investment record)
 */
export async function createInvestmentRedemption(
  tx: Transaction,
  investmentId: string,
  units: number,
  _nav: number
): Promise<void> {
  const db = await getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, tx);
    updateBalanceRaw(db, tx.accountId, tx.amount);
    db.execute(
      `UPDATE investments SET quantity = quantity - ?, invested_amount = invested_amount - ? WHERE id = ?`,
      [units, tx.amount, investmentId]
    );
  });
}
