# FinTrack — Personal Finance Tracker

## Overview

Personal finance tracker for the Indian market. Single-user app tracking savings, credit cards, EMI cards, mutual funds, fixed deposits, and cash with proper double-entry bookkeeping.

**User:** 40+ year experienced Business Analyst — demands production-grade correctness.

**Personas:** See `PERSONAS.md` for the 6 personas (BA, Architect, Designer, Engineer, Tester, DevOps) and their responsibilities.

**Rule:** Never proceed with a significant change without pulling the relevant persona first.

---

## User's Financial Profile

| Account | Type | Details |
|---------|------|---------|
| Slice Salary | Savings | ~₹60k monthly salary |
| Kotak | Savings | Pass-through, ~₹5k balance |
| Slice CC | Credit Card | ₹75k limit, ₹22k outstanding |
| Axis CC | Credit Card | ₹53k limit, ₹4k outstanding |
| UTI Nifty 50 | Mutual Fund | SIP |
| UTI Nifty Next 50 | Mutual Fund | SIP |
| HDFC Flexi Cap | Mutual Fund | SIP |
| Parag Parikh Flexi Cap | Mutual Fund | SIP |
| 6 FDs | Fixed Deposit | ₹15k total, 7.75%, ladder (Aug 2027–Jan 2028) |
| Cash | Cash | ₹1,650 |
| Bajaj | EMI Card | ₹1.25L limit (mentioned, not yet in data) |

---

## Business Rules

### BR-01: Account-Specific Transaction Types

Each account type shows only relevant transaction options:

| Account Type | Allowed Transaction Types | Counterpart Required |
|-------------|--------------------------|---------------------|
| `savings` | income, expense, transfer, interest | No (except transfer) |
| `checking` | income, expense, transfer, interest | No (except transfer) |
| `credit_card` | expense, transfer, income | transfer → savings/checking/cash |
| `emi_card` | emi_purchase, emi_payment | emi_payment → savings/checking/cash |
| `investment` | investment, redemption, dividend, interest | No |
| `fixed_deposit` | fd_create, fd_mature | fd_mature → savings/checking |
| `cash` | income, expense, transfer | No (except transfer) |

### BR-02: Double-Entry Bookkeeping

Every transfer creates TWO linked transactions:
- Primary: on the source account
- Counterpart: on the destination account
- Both share `counterpartAccountId` for traceability
- Both are inserted atomically via `db.withTransactionAsync()`
- If either insert fails, BOTH roll back

### BR-03: Sign Conventions (Complete)

All monetary values stored as **paise** (integer). Positive = money you have. Negative = money you owe.

| Account Type | Transaction Type | Balance Delta | Explanation |
|-------------|-----------------|---------------|-------------|
| `savings` | income | +amount | Money received |
| `savings` | expense | -amount | Money spent |
| `savings` | transfer (outgoing) | -amount | Sent to another account |
| `savings` | transfer (incoming) | +amount | Received from another account |
| `savings` | interest | +amount | Interest credited |
| `savings` | fee | -amount | Bank charges |
| `checking` | (same as savings) | — | — |
| `credit_card` | expense | +amount | Outstanding increases (you owe more) |
| `credit_card` | transfer (pay bill) | -amount | Outstanding decreases (you paid) |
| `credit_card` | income (refund) | -amount | Outstanding decreases (merchant refunded) |
| `credit_card` | fee | -amount | Late fee charges outstanding |
| `emi_card` | emi_purchase | +amount | Outstanding increases |
| `emi_card` | emi_payment | -amount | Outstanding decreases |
| `investment` | investment (buy) | -amount | Cash leaves savings |
| `investment` | redemption (sell) | +amount | Cash returns to savings |
| `investment` | dividend | +amount | Income received |
| `investment` | interest | +amount | Interest received |
| `fixed_deposit` | fd_create | -amount | Cash locked in FD |
| `fixed_deposit` | fd_mature | +amount | Cash returns to savings |
| `cash` | income | +amount | Cash received |
| `cash` | expense | -amount | Cash spent |
| `cash` | transfer (outgoing) | -amount | Sent to another account |
| `cash` | transfer (incoming) | +amount | Received from another account |

### BR-04: Balance Delta Formula

Single source of truth: `computeBalanceDelta(accountType, txType, amount, direction)`
- `direction: 'outgoing'` = the account where the transaction is initiated (default)
- `direction: 'incoming'` = the counterpart account

### BR-05: Cashflow Classification

- `isIncomeType()`: income, dividend, interest
- `isExpenseType()`: expense, fee, emi_purchase
- `isTransferType()`: transfer, emi_payment, fd_create, fd_mature
- `isInvestmentType()`: investment, redemption

### BR-06: Linked Transfer Display

Transactions screen shows both accounts for transfers:
```
🔄 Savings → Credit Card
```

### BR-07: Category Auto-Mapping

Transaction type determines category filter:
- income/dividend/interest → 'income' categories
- expense/fee/emi_purchase → 'expense' categories
- transfer/emi_payment/fd_create/fd_mature → 'transfer' categories

---

## Acceptance Criteria

### AC-01: Transaction Creation
- [ ] User selects account → only valid transaction types shown
- [ ] Transfers require counterpart account selection
- [ ] Amount validated as positive integer (paise)
- [ ] Transaction + balance update happen atomically (all-or-nothing)
- [ ] Store state updates immediately (no stale data)
- [ ] Preview card shows correct sign based on account type

### AC-02: Dashboard
- [ ] Net Worth = Σ all savings + Σ all investments - Σ all CC outstanding - Σ all EMI outstanding
- [ ] Income KPI = Σ income + dividend + interest (current month)
- [ ] Expenses KPI = Σ expense + fee + emi_purchase (current month)
- [ ] Saved KPI = Income - Expenses (current month)
- [ ] CC summary shows: outstanding / limit / utilisation %
- [ ] Accounts grouped by type with correct balances
- [ ] No stale data after adding transactions

### AC-03: Transactions Screen
- [ ] 5 tabs: All, Income, Expenses, Transfers, Investments
- [ ] `emi_purchase` appears in Expenses tab
- [ ] `dividend`/`interest` appears in Income tab
- [ ] Transfers show linked account names
- [ ] Filter by date range works
- [ ] Search by merchant/description works

### AC-04: Insights
- [ ] Spending anomaly detection includes emi_purchase
- [ ] Subscription detection works
- [ ] Low balance detection works
- [ ] No stale `impactPaise` references

### AC-05: Onboarding
- [ ] User can add savings, CC, EMI card, investment, FD, cash accounts
- [ ] Credit card setup includes limit, statement day, due day
- [ ] EMI card setup includes limit
- [ ] FD setup includes rate, maturity date, amount
- [ ] Investment setup includes mode (SIP/lumpsum)
- [ ] After onboarding, accounts appear on dashboard

### AC-06: Settings
- [ ] Tax regime toggle (old vs new)
- [ ] Account summary with correct balances
- [ ] Test mode toggle (for demo data)
- [ ] No placeholder text

### AC-07: Data Integrity
- [ ] All monetary values stored as paise (integer)
- [ ] No floating-point arithmetic for money
- [ ] CHECK constraints in SQLite schema
- [ ] Foreign keys enforced
- [ ] WAL mode enabled
- [ ] Idempotent migrations (safe to re-run)

---

## User Stories

### US-01: Record a Salary Credit
> As a user, I want to record my salary credited to Slice savings so my balance reflects actual funds.

**Given** Slice Savings has ₹45,000
**When** I add income of ₹60,000
**Then** Slice Savings balance = ₹105,000
**And** Income KPI increases by ₹60,000

### US-02: Pay Credit Card Bill
> As a user, I want to pay my Slice CC bill from Slice savings so my outstanding decreases.

**Given** Slice CC outstanding = -₹22,000, Slice Savings = ₹105,000
**When** I add transfer of ₹15,000 from Slice Savings to Slice CC
**Then** Slice CC outstanding = -₹7,000
**And** Slice Savings = ₹90,000
**And** Two linked transactions created atomically

### US-03: Record SIP Investment
> As a user, I want to record my monthly SIP so my investment balance increases and savings decreases.

**Given** UTI Nifty 50 has ₹45,000, Slice Savings = ₹90,000
**When** I add investment of ₹5,000 to UTI Nifty 50
**Then** UTI Nifty 50 = ₹50,000
**And** Slice Savings = ₹85,000
**And** Transaction shows units and NAV

### US-04: Record EMI Purchase
> As a user, I want to record an EMI purchase on Bajaj so my outstanding increases.

**Given** Bajaj EMI Card outstanding = ₹0
**When** I add EMI purchase of ₹12,000 with 6-month tenure
**Then** Bajaj outstanding = ₹12,000
**And** Monthly EMI preview shows ₹2,000

### US-05: Record FD Creation
> As a user, I want to create an FD so my savings decreases and FD balance tracks maturity.

**Given** Slice Savings = ₹85,000
**When** I create FD of ₹15,000 at 7.75% maturing Jan 2028
**Then** Slice Savings = ₹70,000
**And** FD account shows ₹15,000 with maturity date and rate

### US-06: View Monthly Cashflow
> As a user, I want to see my income vs expenses for the current month.

**Given** Current month has salary ₹60,000, expenses ₹45,000
**When** I view dashboard
**Then** Income KPI = ₹60,000
**And** Expenses KPI = ₹45,000
**And** Saved KPI = ₹15,000

### US-07: Record Interest Earned
> As a user, I want to record interest credited by my bank so my net worth reflects actual balances.

**Given** Slice Savings = ₹70,000
**When** I add interest of ₹350
**Then** Slice Savings = ₹70,350
**And** Interest appears in Income tab

---

## Implementation Phases

### Phase 1: Data Model Foundation ✅ COMPLETE

| Task | Status |
|------|--------|
| New AccountType: `emi_card`, `fixed_deposit` | ✅ |
| New TransactionType: `fd_create`, `fd_mature`, `emi_purchase`, `emi_payment` | ✅ |
| Account fields: `emiTenure`, `emiMonthlyAmount`, `fdRate`, `fdMaturityDate`, `fdMaturityAmount`, `fdStartDate` | ✅ |
| Transaction fields: `emiTenure`, `emiNumber`, `fdRate`, `fdMaturityDate` | ✅ |
| `TransactionTypeOption` interface | ✅ |
| `getTransactionTypesForAccount()` mapping | ✅ |
| `computeBalanceDelta()` with direction param | ✅ |
| `isIncomeType()`, `isExpenseType()`, `isTransferType()`, `isInvestmentType()` | ✅ |
| Engine `index.ts` exports | ✅ |
| 43 unit tests in `accountTypes.test.ts` | ✅ |

### Phase 2: AddTransactionScreen Redesign ✅ COMPLETE

| Task | Status |
|------|--------|
| DB migration v5 (idempotent column additions) | ✅ |
| `accountRepository`: `updateAccountBalances()`, `getAccountsByType()` | ✅ |
| `transactionRepository`: `insertLinkedTransactions()` (atomic) | ✅ |
| AddTransactionScreen: dynamic type selector | ✅ |
| AddTransactionScreen: counterpart account picker | ✅ |
| AddTransactionScreen: investment fields (NAV, units) | ✅ |
| AddTransactionScreen: FD fields (rate, maturity date) | ✅ |
| AddTransactionScreen: EMI fields (tenure, monthly preview) | ✅ |
| AddTransactionScreen: validation via useMemo | ✅ |
| AddTransactionScreen: preview card with correct signs | ✅ |

### Phase 3: Dashboard & Transactions Screens ✅ COMPLETE

| Task | Status |
|------|--------|
| `financeStore`: `isIncomeType`/`isExpenseType` cashflow logic | ✅ |
| `financeStore`: transfers + investments in CashflowSummary | ✅ |
| DashboardScreen: Net Worth hero, Income/Expenses/Saved KPIs | ✅ |
| DashboardScreen: Credit Card summary (outstanding/limit/utilisation) | ✅ |
| DashboardScreen: Investment summary card | ✅ |
| DashboardScreen: Accounts grouped by type | ✅ |
| TransactionsScreen: 5-tab filter (All/Income/Expenses/Transfers/Investments) | ✅ |
| TransactionsScreen: linked account display for transfers | ✅ |
| Seed data: fixed account types (`savings`, `investment`, `cash`) | ✅ |

### Phase 3.5: Interest Transaction Type for Savings Accounts ✅ COMPLETE

**Goal:** Allow users to record interest earned on savings/checking accounts.

**User Story:** As a user, I want to record interest credited by my bank (Slice daily at RBI repo rate, Kotak quarterly) so my net worth reflects actual balances.

**Approach:**
- Manual entry — user types amount, no auto-calculation
- Optional interest rate field (informational only, e.g., 6.5%)
- No separate dashboard card — stays inside "Income" KPI
- No new filter tab — interest shows under existing "Income" tab

| Task | Status |
|------|--------|
| `types.ts`: Add `interest` to `savings`/`checking` case in `getTransactionTypesForAccount()` | ✅ |
| `types.ts`: Add `interestRate?: number` field to `Transaction` interface | ✅ |
| `types.ts`: Add `fields: ['interestRate']` to interest option for savings/checking | ✅ |
| DB migration v6: `addColumnIfMissing(db, 'transactions', 'interest_rate', 'REAL')` | ✅ |
| `transactionRepository.ts`: Add `interest_rate` to INSERT SQL + `mapRow` | ✅ |
| `AddTransactionScreen.tsx`: Add `interestRate` state + `showInterestFields` flag | ✅ |
| `AddTransactionScreen.tsx`: Add optional rate input field in form | ✅ |
| `AddTransactionScreen.tsx`: Include `interestRate` in transaction object + validation | ✅ |
| `accountTypes.test.ts`: 7 new tests (availability, classification, balance delta) | ✅ |

**No changes needed:** TransactionsScreen (already shows under Income), DashboardScreen (already in Income KPI), financeStore, seedData, cashback, accountRepository.

**Business Rules:**
- Interest is always income (positive balance delta)
- Rate field is optional — for user reference only
- No validation on rate value (user can enter any number)
- Category auto-selected as "Interest Income" (via existing income category filter)

---

### Phase 4: Onboarding & Settings ✅ COMPLETE

| Task | Status |
|------|--------|
| OnboardingScreen: add EMI Card and Fixed Deposit account types | ✅ |
| SettingsScreen: account management with new types | ✅ |
| SettingsScreen: FD maturity tracker | ✅ |
| SettingsScreen: EMI card outstanding view | ✅ |

### Phase 5: CSV Import for New Account Types ✅ COMPLETE

| Task | Status |
|------|--------|
| EMI card CSV import (Bajaj statement format) | ✅ |
| FD creation CSV import | ✅ |
| Investment transaction CSV import | ✅ |
| CSV import updates account balances correctly | ✅ |

### Phase 6: Advanced Features ✅ COMPLETE

| Task | Status |
|------|--------|
| FD maturity reminders/notifications | ✅ |
| EMI payment reminders | ✅ |
| Investment portfolio tracking (NAV updates) | ✅ |
| CC outstanding trend chart | ✅ |
| Net worth over time chart | ✅ |

---

## Technical Architecture

```
packages/engine/src/
├── types.ts              # AccountType, TransactionType, helpers
├── cashback.ts           # Slice Monies, Axis SuperMoney
├── index.ts              # Exports all engine functions
└── __tests__/
    └── accountTypes.test.ts  # 48 tests

apps/mobile/src/
├── screens/
│   ├── AddTransactionScreen.tsx    # REWRITTEN - dynamic form
│   ├── DashboardScreen.tsx         # REWRITTEN - grouped accounts
│   ├── TransactionsScreen.tsx      # REWRITTEN - 5-tab filter
│   └── OnboardingScreen.tsx        # NEEDS UPDATE
├── storage/
│   ├── database.ts                 # Migration v5 (idempotent)
│   └── repositories/
│       ├── accountRepository.ts    # New: updateAccountBalances, getAccountsByType
│       └── transactionRepository.ts # New: insertLinkedTransactions
├── store/
│   └── financeStore.ts             # Updated: isIncomeType/isExpenseType
└── services/
    └── csvImportService.ts         # Existing: works with new types
```

---

## Key Design Decisions

1. **No `wallet` type** — renamed to `cash` (matches user's profile)
2. **No `savings_account`** — use `savings` (simpler, matches AccountType union)
3. **No `investment_account`** — use `investment` (consistent with AccountType)
4. **`emi_card` as separate type** — not a credit card variant, different transaction rules
5. **`fixed_deposit` as separate type** — tracks maturity, rate, not just a savings variant
6. **Atomic linked transfers** — `db.withTransactionAsync()` ensures both sides succeed or fail
7. **Direction-aware balance delta** — single function handles all account/transaction combos
8. **Idempotent migrations** — each ALTER TABLE checks column existence first
