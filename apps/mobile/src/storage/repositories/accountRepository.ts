import { getDatabase } from '../database';
import type { Account, AccountType } from '@finance/engine';

export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order'
  );
  return rows.map(mapRow);
}

export async function getAccountById(id: string): Promise<Account | null> {
  const db = await getDatabase();
  const row = db.getFirst<Record<string, unknown>>(
    'SELECT * FROM accounts WHERE id = ?', [id]
  );
  return row ? mapRow(row) : null;
}

export async function insertAccount(account: Account): Promise<void> {
  const db = await getDatabase();
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

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function updateAccountBalance(accountId: string, deltaPaise: number): Promise<void> {
  const db = await getDatabase();
  db.execute(
    `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
    [deltaPaise, todayDateString(), accountId]
  );
}

export async function updateAccountBalances(deltas: { accountId: string; delta: number }[]): Promise<void> {
  const db = await getDatabase();
  const today = todayDateString();
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
  const db = await getDatabase();
  const rows = db.getAll<Record<string, unknown>>(
    'SELECT * FROM accounts WHERE type = ? AND is_archived = 0 ORDER BY sort_order',
    [type]
  );
  return rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as AccountType,
    institution: row.institution ? (row.institution as string) : undefined,
    currency: row.currency as string,
    balance: row.balance as number,
    balanceAsOf: row.balance_as_of as string,
    creditLimit: row.credit_limit ? (row.credit_limit as number) : undefined,
    statementDay: row.statement_day ? (row.statement_day as number) : undefined,
    dueDay: row.due_day ? (row.due_day as number) : undefined,
    apr: row.apr ? (row.apr as number) : undefined,
    color: row.color as string,
    icon: row.icon as string,
    isHidden: (row.is_hidden as number) === 1,
    isArchived: (row.is_archived as number) === 1,
    sortOrder: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    investmentMode: row.investment_mode ? (row.investment_mode as 'sip' | 'onetime') : undefined,
    location: row.location ? (row.location as string) : undefined,
    subType: row.sub_type ? (row.sub_type as string) : undefined,
    emiTenure: row.emi_tenure ? (row.emi_tenure as number) : undefined,
    emiMonthlyAmount: row.emi_monthly_amount ? (row.emi_monthly_amount as number) : undefined,
    fdRate: row.fd_rate ? (row.fd_rate as number) : undefined,
    fdMaturityDate: row.fd_maturity_date ? (row.fd_maturity_date as string) : undefined,
    fdMaturityAmount: row.fd_maturity_amount ? (row.fd_maturity_amount as number) : undefined,
    fdStartDate: row.fd_start_date ? (row.fd_start_date as string) : undefined,
  };
}