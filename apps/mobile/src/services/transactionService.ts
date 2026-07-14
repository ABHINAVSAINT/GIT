import { getDatabase } from '../storage/database';
import type { Transaction } from '@finance/engine';
import type { DB } from '../storage/database';
import { insertTransactionRaw } from '../storage/repositories/transactionRepository';

/**
 * Transaction Service
 * Orchestrates multi-step transaction operations atomically.
 * All operations use db.transaction() for data integrity.
 */

function updateBalanceRaw(db: DB, accountId: string, deltaPaise: number): void {
  const today = new Date().toISOString().slice(0, 10);
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
  nav: number
): Promise<void> {
  const db = await getDatabase();
  db.transaction(() => {
    insertTransactionRaw(db, tx);
    updateBalanceRaw(db, tx.accountId, tx.amount);
    // Note: For simplicity, we don't update average_cost on redemption.
    // In production, you'd want to calculate the proportional cost basis reduction.
    db.execute(
      `UPDATE investments SET quantity = quantity - ?, invested_amount = invested_amount - ? WHERE id = ?`,
      [units, tx.amount, investmentId]
    );
  });
}
