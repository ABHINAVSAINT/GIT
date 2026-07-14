import { open, DB } from '@op-engineering/op-sqlite';

let db: DB | null = null;

export async function getDatabase(): Promise<DB> {
  if (db) return db;

  db = open({ name: 'finance.db' });

  db.execute('PRAGMA journal_mode = WAL;');
  db.execute('PRAGMA foreign_keys = ON;');
  db.execute('PRAGMA busy_timeout = 5000;');

  try {
    const integrity = db.getFirst<{ integrity_check: string }>(
      'PRAGMA quick_check;'
    );
    if (integrity && integrity.integrity_check !== 'ok') {
      throw new Error('Database integrity check failed');
    }
  } catch {
    // integrity check not supported or failed; continue anyway
  }

  await runMigrations(db);
  return db;
}

// ── Schema ────────────────────────────────────────────────

const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  institution TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  balance INTEGER NOT NULL DEFAULT 0,
  balance_as_of TEXT,
  credit_limit INTEGER,
  statement_day INTEGER,
  due_day INTEGER,
  apr REAL,
  color TEXT NOT NULL DEFAULT '#0EA5E9',
  icon TEXT NOT NULL DEFAULT '💰',
  is_hidden INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  counterpart_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  posted_date TEXT,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  tags TEXT DEFAULT '[]',
  merchant TEXT,
  description TEXT NOT NULL DEFAULT '',
  notes TEXT,
  receipt_image_uri TEXT,
  recurring_rule_id TEXT,
  investment_id TEXT,
  units REAL,
  nav_or_price REAL,
  status TEXT NOT NULL DEFAULT 'cleared',
  is_recurring INTEGER NOT NULL DEFAULT 0,
  is_tax_relevant INTEGER NOT NULL DEFAULT 0,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted ON transactions(is_deleted) WHERE is_deleted = 0;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#64748B',
  is_system INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  budget_amount INTEGER,
  budget_period TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  symbol TEXT,
  isin TEXT,
  quantity REAL NOT NULL DEFAULT 0,
  average_cost REAL NOT NULL DEFAULT 0,
  invested_amount INTEGER NOT NULL DEFAULT 0,
  current_price REAL NOT NULL DEFAULT 0,
  current_price_as_of TEXT,
  current_value INTEGER NOT NULL DEFAULT 0,
  unrealized_gain INTEGER NOT NULL DEFAULT 0,
  unrealized_gain_pct REAL NOT NULL DEFAULT 0,
  xirr REAL,
  twrr REAL,
  absolute_return REAL NOT NULL DEFAULT 0,
  annualized_return REAL NOT NULL DEFAULT 0,
  scheme_code TEXT,
  folio_number TEXT,
  registrar TEXT,
  total_dividends INTEGER NOT NULL DEFAULT 0,
  tags TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  target_amount INTEGER NOT NULL,
  current_amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  target_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  monthly_contribution INTEGER NOT NULL DEFAULT 0,
  contribution_account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  step_up_percentage REAL,
  step_up_month INTEGER,
  expected_return REAL NOT NULL,
  inflation_rate REAL,
  linked_investment_ids TEXT DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'on_track',
  probability_of_success REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  original_principal INTEGER NOT NULL,
  outstanding_principal INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  tenure_months INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  emi INTEGER NOT NULL,
  emi_day INTEGER,
  total_interest_payable INTEGER NOT NULL DEFAULT 0,
  total_paid INTEGER NOT NULL DEFAULT 0,
  remaining_tenure_months INTEGER NOT NULL DEFAULT 0,
  payoff_date TEXT,
  offset_investment_ids TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  type TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  merchant TEXT,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT DEFAULT '[]',
  frequency TEXT NOT NULL,
  day_of_month INTEGER,
  day_of_week INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  occurrences INTEGER,
  next_run_date TEXT NOT NULL,
  last_run_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  auto_create INTEGER NOT NULL DEFAULT 1,
  notify_before_days INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calc_audit_log (
  id TEXT PRIMARY KEY,
  calc_type TEXT NOT NULL,
  input_hash TEXT,
  output TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TEXT
);
`;

// ── Migrations ────────────────────────────────────────────

const migrations: Array<{ version: number; name: string; up: string }> = [
  { version: 1, name: 'initial_schema', up: SCHEMA_V1 },
  { version: 2, name: 'add_price_cache', up: `
    CREATE TABLE IF NOT EXISTS price_cache (
      key TEXT PRIMARY KEY,
      price REAL NOT NULL,
      as_of TEXT NOT NULL,
      source TEXT NOT NULL,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `},
  { version: 3, name: 'add_account_metadata', up: `
    ALTER TABLE accounts ADD COLUMN investment_mode TEXT;
    ALTER TABLE accounts ADD COLUMN location TEXT;
    ALTER TABLE accounts ADD COLUMN sub_type TEXT;
  `},
  { version: 4, name: 'add_cashback_columns', up: `
    ALTER TABLE transactions ADD COLUMN cashback_paise INTEGER;
    ALTER TABLE transactions ADD COLUMN cashback_program TEXT;
    ALTER TABLE transactions ADD COLUMN cashback_description TEXT;
  `},
  { version: 5, name: 'add_emi_fd_columns', up: `` },
  { version: 6, name: 'add_constraints_and_interest', up: `
    ALTER TABLE transactions ADD COLUMN interest_rate REAL;
  ` },
];

function columnExists(database: DB, table: string, column: string): boolean {
  const cols = database.getAll<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.some(c => c.name === column);
}

function addColumnIfMissing(database: DB, table: string, column: string, type: string): void {
  if (!columnExists(database, table, column)) {
    database.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

async function runMigrations(database: DB): Promise<void> {
  database.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const row = database.getFirst<{ max: number }>(
    'SELECT COALESCE(MAX(version), 0) as max FROM schema_migrations;'
  );
  const currentVersion = row?.max ?? 0;

  for (const m of migrations) {
    if (m.version > currentVersion) {
      if (m.up) {
        database.execute(m.up);
      }
      if (m.version === 5) {
        addColumnIfMissing(database, 'transactions', 'emi_tenure', 'INTEGER');
        addColumnIfMissing(database, 'transactions', 'emi_number', 'INTEGER');
        addColumnIfMissing(database, 'transactions', 'fd_rate', 'REAL');
        addColumnIfMissing(database, 'transactions', 'fd_maturity_date', 'TEXT');
        addColumnIfMissing(database, 'accounts', 'emi_tenure', 'INTEGER');
        addColumnIfMissing(database, 'accounts', 'emi_monthly_amount', 'INTEGER');
        addColumnIfMissing(database, 'accounts', 'fd_rate', 'REAL');
        addColumnIfMissing(database, 'accounts', 'fd_maturity_date', 'TEXT');
        addColumnIfMissing(database, 'accounts', 'fd_maturity_amount', 'INTEGER');
        addColumnIfMissing(database, 'accounts', 'fd_start_date', 'TEXT');
      }
      database.execute(
        'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)',
        [m.version, m.name]
      );
    }
  }

  // Ensure v5 columns exist even if migration was partially applied before
  if (currentVersion >= 5) {
    addColumnIfMissing(database, 'transactions', 'emi_tenure', 'INTEGER');
    addColumnIfMissing(database, 'transactions', 'emi_number', 'INTEGER');
    addColumnIfMissing(database, 'transactions', 'fd_rate', 'REAL');
    addColumnIfMissing(database, 'transactions', 'fd_maturity_date', 'TEXT');
    addColumnIfMissing(database, 'accounts', 'emi_tenure', 'INTEGER');
    addColumnIfMissing(database, 'accounts', 'emi_monthly_amount', 'INTEGER');
    addColumnIfMissing(database, 'accounts', 'fd_rate', 'REAL');
    addColumnIfMissing(database, 'accounts', 'fd_maturity_date', 'TEXT');
    addColumnIfMissing(database, 'accounts', 'fd_maturity_amount', 'INTEGER');
    addColumnIfMissing(database, 'accounts', 'fd_start_date', 'TEXT');
  }
}
