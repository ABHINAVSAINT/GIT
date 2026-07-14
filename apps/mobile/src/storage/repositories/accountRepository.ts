import { getDatabase } from '../database';
import type { Account } from '@finance/engine';

export async function getAllAccounts(): Promise<Account[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order'
  );
  return rows.map(mapRow);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = getDatabase();
  const row = db.getFirst<any>(
    'SELECT * FROM accounts WHERE id = ?', [id]
  );
  return row ? mapRow(row) : null;
}

export async function insertAccount(account: Account): Promise<void> {
  const db = getDatabase();
  db.execute(
    `INSERT INTO accounts (id, name, type, institution, currency, balance, balance_as_of,
      credit_limit, statement_day, due_day, apr, color, icon, is_hidden, is_archived, sort_order,
      investment_mode, location, sub_type,
      emi_tenure, emi_monthly_amount, fd_rate, fd_maturity_date, fd_maturity_amount, fd_start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      account.id, account.name, account.type, account.institution ?? null,
      account.currency, account.balance, account.balanceAsOf,
      account.creditLimit ?? null, account.statementDay ?? null,
      account.dueDay ?? null, account.apr ?? null,
      account.color, account.icon, account.isHidden ? 1 : 0,
      account.isArchived ? 1 : 0, account.sortOrder,
      account.investmentMode ?? null, account.location ?? null, account.subType ?? null,
      account.emiTenure ?? null, account.emiMonthlyAmount ?? null,
      account.fdRate ?? null, account.fdMaturityDate ?? null,
      account.fdMaturityAmount ?? null, account.fdStartDate ?? null,
    ]
  );
}

export async function updateAccountBalance(accountId: string, deltaPaise: number): Promise<void> {
  const db = getDatabase();
  db.execute(
    `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
    [deltaPaise, new Date().toISOString().split('T')[0], accountId]
  );
}

export async function updateAccountBalances(deltas: { accountId: string; delta: number }[]): Promise<void> {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  db.transaction(() => {
    for (const { accountId, delta } of deltas) {
      db.execute(
        `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
        [delta, today, accountId]
      );
    }
  });
}

export async function getAccountsByType(type: string): Promise<Account[]> {
  const db = getDatabase();
  const rows = db.getAll<any>(
    'SELECT * FROM accounts WHERE type = ? AND is_archived = 0 ORDER BY sort_order',
    [type]
  );
  return rows.map(mapRow);
}

function mapRow(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    institution: row.institution ?? undefined,
    currency: row.currency,
    balance: row.balance,
    balanceAsOf: row.balance_as_of,
    creditLimit: row.credit_limit ?? undefined,
    statementDay: row.statement_day ?? undefined,
    dueDay: row.due_day ?? undefined,
    apr: row.apr ?? undefined,
    color: row.color,
    icon: row.icon,
    isHidden: row.is_hidden === 1,
    isArchived: row.is_archived === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    investmentMode: row.investment_mode ?? undefined,
    location: row.location ?? undefined,
    subType: row.sub_type ?? undefined,
    emiTenure: row.emi_tenure ?? undefined,
    emiMonthlyAmount: row.emi_monthly_amount ?? undefined,
    fdRate: row.fd_rate ?? undefined,
    fdMaturityDate: row.fd_maturity_date ?? undefined,
    fdMaturityAmount: row.fd_maturity_amount ?? undefined,
    fdStartDate: row.fd_start_date ?? undefined,
  };
}
