# FinTrack — Architecture Document

## Overview

Monorepo structure with pure TypeScript engine and Expo React Native mobile app. Designed for correctness, testability, and maintainability.

---

## Current Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| No DTO layer — domain types leak to UI | High | UI coupled to DB schema |
| Anemic store — business logic in screens | High | Duplicated logic, hard to test |
| Non-atomic balance updates | Critical | Data corruption possible |
| Engine package too monolithic | Medium | Hard to tree-shake, unclear boundaries |
| No CHECK constraints in schema | High | Invalid data can be inserted |
| No event system | Medium | UI doesn't react to external changes |
| Fragile migrations | Medium | Partial failures leave DB in bad state |

---

## Target Architecture

```
packages/engine/src/
├── types.ts                    # Core domain types (Account, Transaction, etc.)
├── accountTypes.ts             # getTransactionTypesForAccount, computeBalanceDelta
├── insightsEngine.ts           # generateInsights
├── cashback.ts                 # Slice Monies, Axis SuperMoney
├── emi.ts                      # EMI/SIP/compound interest calculations
├── xirr.ts                     # XIRR computation
├── twrr.ts                     # TWRR computation
├── portfolio.ts                # Portfolio metrics
├── monteCarlo.ts               # Monte Carlo simulation
├── index.ts                    # Barrel exports
└── __tests__/
    ├── accountTypes.test.ts    # 48+ tests
    └── ...

apps/mobile/src/
├── screens/                    # UI components (thin)
├── components/                 # Reusable UI components
├── store/
│   └── financeStore.ts         # Zustand store (business logic lives here)
├── storage/
│   ├── database.ts             # Schema + migrations
│   ├── repositories/           # Data access layer (DB queries)
│   └── seedData.ts             # Demo data
├── services/
│   ├── csvImportService.ts     # CSV import logic
│   └── transactionService.ts   # Transaction creation orchestration
├── design-system/
│   ├── tokens.ts               # Design tokens
│   └── theme/                  # Theme provider
└── utils/                      # Helper functions
```

---

## Layer Responsibilities

### 1. Engine Package (`@finance/engine`)

**Responsibility:** Pure business logic. No DB, no UI, no side effects.

**Exports:**
- Types: `Account`, `Transaction`, `AccountType`, `TransactionType`
- Helpers: `computeBalanceDelta`, `getTransactionTypesForAccount`
- Classifiers: `isIncomeType`, `isExpenseType`, `isTransferType`, `isInvestmentType`
- Calculations: `calculateEMI`, `sipFutureValue`, `compoundInterest`
- Analytics: `computeXIRR`, `computeTWRR`, `computePortfolioMetrics`
- Insights: `generateInsights`
- Cashback: `calculateCashback`, `calculateSliceMonies`, `calculateAxisSuperMoney`

**Rules:**
- Zero imports from `apps/mobile`
- Zero React/RN imports
- All functions are pure (same input → same output)
- All monetary values are paise (integer)

### 2. Repository Layer

**Responsibility:** Data access. Maps DB rows ↔ domain types.

**Pattern:**
```typescript
// Raw DB row (snake_case, SQLite types)
interface AccountRow {
  id: string;
  name: string;
  type: string;
  balance: number;
  // ...
}

// Domain type (camelCase, TypeScript types)
interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  // ...
}

// Repository function
export async function getAllAccounts(): Promise<Account[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AccountRow>('SELECT * FROM accounts');
  return rows.map(mapRow);  // ← mapping happens here
}
```

**Rules:**
- Every repository function returns domain types, never raw rows
- `mapRow()` is the single mapping point per table
- No business logic in repositories (just queries + mapping)

### 3. Service Layer

**Responsibility:** Orchestrate multi-step operations atomically.

**Pattern:**
```typescript
// transactionService.ts
export async function createTransferTransaction(
  primary: Transaction,
  counterpart: Transaction
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    // 1. Insert primary transaction
    await insertTransactionRaw(db, primary);
    // 2. Insert counterpart transaction
    await insertTransactionRaw(db, counterpart);
    // 3. Update source account balance
    await updateBalanceRaw(db, primary.accountId, primaryDelta);
    // 4. Update destination account balance
    await updateBalanceRaw(db, counterpart.accountId, counterpartDelta);
  });
  // All 4 operations succeed or ALL roll back
}
```

**Rules:**
- All multi-step operations use `db.withTransactionAsync()`
- Services call repositories, never raw SQL
- Services update the store after DB operations

### 4. Store Layer (Zustand)

**Responsibility:** Client-side state. Derived computations. UI-facing actions.

**Pattern:**
```typescript
interface FinanceState {
  // State
  accounts: Account[];
  transactions: Transaction[];
  netWorth: number;
  monthlyCashflow: CashflowSummary;

  // Actions (call services, update state)
  addTransfer: (sourceId: string, destId: string, amount: number) => Promise<void>;
  addIncome: (accountId: string, amount: number, categoryId: string) => Promise<void>;
}
```

**Rules:**
- Store actions call service functions
- Store recomputes derived state (netWorth, cashflow) on every update
- No DB queries in store (only in repositories)
- No UI logic in store (only state + derived state)

### 5. Screen Layer

**Responsibility:** UI rendering. User input handling. Navigation.

**Rules:**
- Screens call store actions, never repositories directly
- Screens are thin — business logic lives in store/services
- Screens use design-system tokens, never raw colors

---

## Database Schema Improvements

### CHECK Constraints (Migration v6)

```sql
-- Account type validation
ALTER TABLE accounts ADD CONSTRAINT chk_account_type
  CHECK (type IN ('savings', 'checking', 'credit_card', 'emi_card', 'investment', 'fixed_deposit', 'cash'));

-- Transaction type validation
ALTER TABLE transactions ADD CONSTRAINT chk_transaction_type
  CHECK (type IN ('income', 'expense', 'transfer', 'fee', 'dividend', 'interest',
                  'investment', 'redemption', 'emi_purchase', 'emi_payment',
                  'fd_create', 'fd_mature'));

-- Amount must be positive
ALTER TABLE transactions ADD CONSTRAINT chk_amount_positive
  CHECK (amount > 0);

-- Balance can be negative (credit cards owe money)
-- No constraint needed, but document the convention

-- Status validation
ALTER TABLE transactions ADD CONSTRAINT chk_status
  CHECK (status IN ('cleared', 'pending', 'reconciled'));

-- Currency validation
ALTER TABLE accounts ADD CONSTRAINT chk_currency
  CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP'));
```

### Migration Safety

```typescript
// Safe migration pattern
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  // 1. Create migration tracking table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Get current version
  const row = await db.getFirstAsync<{ max: number }>(
    'SELECT COALESCE(MAX(version), 0) as max FROM schema_migrations;'
  );
  const currentVersion = row?.max ?? 0;

  // 3. Apply pending migrations
  for (const m of migrations) {
    if (m.version > currentVersion) {
      try {
        if (m.up) await db.execAsync(m.up);
        await db.runAsync(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [m.version, m.name]
        );
      } catch (error) {
        console.error(`Migration v${m.version} failed:`, error);
        // Don't throw — allow app to continue with partial schema
        // Next launch will retry
      }
    }
  }
}
```

---

## Atomic Operation Patterns

### Pattern 1: Single Transaction + Balance Update

```typescript
// For: income, expense, fee, interest, dividend
export async function insertTransactionAndBalance(
  tx: Transaction,
  deltaPaise: number
): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  await db.withTransactionAsync(async () => {
    await insertTransactionRaw(db, tx);
    if (deltaPaise !== 0) {
      await db.runAsync(
        `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
        [deltaPaise, today, tx.accountId]
      );
    }
  });
}
```

### Pattern 2: Linked Transfer (Two Transactions + Two Balance Updates)

```typescript
// For: CC pay bill, FD create/mature, EMI payment, savings transfer
export async function insertLinkedTransactions(
  primary: Transaction,
  counterpart: Transaction,
  primaryDelta: number,
  counterpartDelta: number
): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  await db.withTransactionAsync(async () => {
    await insertTransactionRaw(db, primary);
    await insertTransactionRaw(db, counterpart);
    await db.runAsync(
      `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
      [primaryDelta, today, primary.accountId]
    );
    await db.runAsync(
      `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
      [counterpartDelta, today, counterpart.accountId]
    );
  });
}
```

### Pattern 3: Investment Buy (Three Operations)

```typescript
// For: SIP purchase (transaction + balance update + investment record update)
export async function createInvestmentPurchase(
  tx: Transaction,
  investmentId: string,
  units: number,
  nav: number
): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  await db.withTransactionAsync(async () => {
    // 1. Insert transaction
    await insertTransactionRaw(db, tx);
    // 2. Update account balance
    await db.runAsync(
      `UPDATE accounts SET balance = balance + ?, balance_as_of = ? WHERE id = ?`,
      [-tx.amount, today, tx.accountId]
    );
    // 3. Update investment record
    await db.runAsync(
      `UPDATE investments SET quantity = quantity + ?, average_cost = ?, invested_amount = invested_amount + ? WHERE id = ?`,
      [units, nav, tx.amount, investmentId]
    );
  });
}
```

---

## Event System (Future)

For external changes (CSV import, sync), emit events:

```typescript
// Simple event emitter
type EventType = 'transaction:created' | 'account:updated' | 'data:imported';

interface FinanceEvent {
  type: EventType;
  payload: any;
  timestamp: number;
}

// In store
const listeners = new Map<EventType, Set<(event: FinanceEvent) => void>>();

export function onEvent(type: EventType, handler: (event: FinanceEvent) => void) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(handler);
  return () => listeners.get(type)?.delete(handler);
}

function emit(event: FinanceEvent) {
  listeners.get(event.type)?.forEach(handler => handler(event));
}
```

---

## Testing Strategy

### Engine Tests (vitest)
- Pure function tests — no mocks needed
- Run: `npm run test` in `packages/engine`
- Target: 100% coverage on `types.ts`, `accountTypes.ts`

### Repository Tests
- Mock SQLite database
- Test mapping functions
- Test atomic operations

### Integration Tests
- Real SQLite database (in-memory)
- Test full transaction flow
- Test migration safety

### E2E Tests (Future)
- Detox or Maestro
- Test critical user flows

---

## Migration Plan

### Phase 1: Add CHECK Constraints (Low Risk)
1. Add CHECK constraints to new migrations
2. Don't modify existing schema (backward compatible)
3. Add validation in repository layer as interim

### Phase 2: Split Engine Package (Medium Risk)
1. Move `computeBalanceDelta` to `accountTypes.ts`
2. Move cashback to `cashback.ts`
3. Update imports in `index.ts`
4. Run tests after each move

### Phase 3: Add Service Layer (High Impact)
1. Create `transactionService.ts`
2. Move atomic operations from repositories to services
3. Update store to call services
4. Update screens to call store actions

### Phase 4: Add DTO Layer (High Impact)
1. Define DTOs for each table
2. Add mapping functions in repositories
3. Update store to use domain types only
4. Remove raw row types from screens

---

## File Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| Engine | `camelCase.ts` | `accountTypes.ts` |
| Repository | `camelCaseRepository.ts` | `transactionRepository.ts` |
| Service | `camelCaseService.ts` | `transactionService.ts` |
| Store | `camelCaseStore.ts` | `financeStore.ts` |
| Screen | `PascalCaseScreen.tsx` | `DashboardScreen.tsx` |
| Component | `PascalCase.tsx` | `AccountCard.tsx` |
| Test | `camelCase.test.ts` | `accountTypes.test.ts` |

---

## Dependencies

```
@finance/mobile → @finance/engine
@finance/engine → (none, pure TS)
```

**Rule:** Engine never imports from mobile. Mobile always imports from engine.
