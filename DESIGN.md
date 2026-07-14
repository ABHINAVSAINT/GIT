# FinTrack — Design Document

## Design Principles

1. **Progressive Disclosure** — Show only what's needed now, reveal complexity gradually
2. **Indian Market First** — INR formatting, Indian number system (lakhs/crores), local conventions
3. **Dark Mode Native** — Design for dark first, light second
4. **Touch-First** — Minimum 44px touch targets, gesture-friendly
5. **Accessible** — WCAG AA contrast ratios, screen reader support

---

## Current Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Onboarding is a wall of questions | High | Users abandon before starting |
| Transaction form is 680 lines | High | Overwhelming, error-prone |
| No visual hierarchy on dashboard | Medium | Can't find important info quickly |
| Dead Settings screen | High | No real functionality |
| No empty states | Medium | Blank screens confuse users |
| No animations | Low | Feels static, less engaging |

---

## Design System

### Color Tokens (Existing + Additions)

```typescript
export const colors = {
  // Primary palette
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  primaryLight: '#38BDF8',

  // Semantic
  success: '#22C55E',    // Income, positive
  warning: '#F59E0B',    // Alerts, pending
  danger: '#EF4444',     // Expenses, negative
  info: '#6366F1',       // Informational

  // Account type colors
  savings: '#22C55E',    // Green — money you have
  creditCard: '#EF4444', // Red — money you owe
  emiCard: '#F59E0B',    // Amber — EMI outstanding
  investment: '#6366F1', // Purple — growth
  fd: '#14B8A6',         // Teal — locked money
  cash: '#8B5CF6',       // Violet — physical cash

  // Neutrals (existing)
  // ...

  // NEW: Semantic backgrounds
  incomeBg: 'rgba(34, 197, 94, 0.1)',    // Green tint
  expenseBg: 'rgba(239, 68, 68, 0.1)',   // Red tint
  transferBg: 'rgba(99, 102, 241, 0.1)', // Blue tint
};
```

### Typography Scale

```typescript
export const typography = {
  // Hero numbers (Net Worth, KPIs)
  hero: { fontSize: 36, fontWeight: '700', lineHeight: 44, letterSpacing: -0.5 },
  
  // Section headers
  h2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  
  // Body
  body: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  
  // Labels
  label: { fontSize: 14, fontWeight: '500', lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  
  // Amounts
  amountLarge: { fontSize: 24, fontWeight: '700', lineHeight: 32, fontVariant: ['tabular-nums'] },
  amountMedium: { fontSize: 18, fontWeight: '600', lineHeight: 24, fontVariant: ['tabular-nums'] },
  amountSmall: { fontSize: 14, fontWeight: '500', lineHeight: 18, fontVariant: ['tabular-nums'] },
};
```

### Spacing Scale

```typescript
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};
```

### Border Radius

```typescript
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};
```

---

## Screen Designs

### 1. Onboarding Screen (Redesigned)

**Problem:** Current onboarding shows all account types at once. User has to scroll through 6+ sections.

**Solution:** Step-by-step wizard with progress indicator.

```
┌─────────────────────────────────────┐
│  Step 1 of 4                        │
│  ━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░░  │
│                                     │
│  🏦 What bank accounts do you have? │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  + Savings Account          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │  + Current Account          │   │
│  └─────────────────────────────┘   │
│                                     │
│              [Next →]               │
└─────────────────────────────────────┘
```

**Steps:**
1. Bank Accounts (savings, checking, cash)
2. Credit Cards (limit, statement day, due day)
3. Investments (mutual funds, FDs)
4. Review & Finish

**Each step:**
- Shows only relevant account types
- "+" button adds a new account of that type
- Skip button for optional sections
- Progress bar shows completion

### 2. Dashboard Screen (Redesigned)

**Problem:** Current dashboard has no visual hierarchy. Net Worth, KPIs, CC summary, and accounts are all at the same level.

**Solution:** Clear visual hierarchy with cards.

```
┌─────────────────────────────────────┐
│  Net Worth                          │
│  ₹2,45,000                          │
│  ↑ ₹12,000 this month               │
├─────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐         │
│  │ Income   │ │ Expenses │         │
│  │ ₹60,000  │ │ ₹45,000  │         │
│  └──────────┘ └──────────┘         │
│  ┌──────────┐                      │
│  │ Saved    │                      │
│  │ ₹15,000  │                      │
│  └──────────┘                      │
├─────────────────────────────────────┤
│  💳 Credit Cards                    │
│  ┌─────────────────────────────┐   │
│  │ Slice CC    ₹22,000 / ₹75k │   │
│  │ ████████░░░░░░ 29%           │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ Axis CC     ₹4,000 / ₹53k  │   │
│  │ █░░░░░░░░░░░░░ 8%            │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  📈 Investments          ₹1,80,000 │
│  ┌─────────────────────────────┐   │
│  │ UTI Nifty 50      ₹45,000  │   │
│  │ UTI Nifty Next 50 ₹35,000  │   │
│  │ HDFC Flexi Cap    ₹50,000  │   │
│  │ Parag Parikh      ₹50,000  │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  🏦 Bank Accounts                   │
│  ┌─────────────────────────────┐   │
│  │ Slice Salary    ₹1,05,000   │   │
│  │ Kotak           ₹5,000      │   │
│  │ Cash            ₹1,650      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Visual Hierarchy:**
1. **Hero Card** — Net Worth (largest font, centered)
2. **KPI Row** — Income/Expenses/Saved (equal width, side by side)
3. **CC Summary** — Color-coded bars showing utilisation
4. **Investments** — Collapsible list with total
5. **Bank Accounts** — Simple list with balances

### 3. Add Transaction Screen (Progressive Form)

**Problem:** Current form is 680 lines with all fields visible at once. User sees 15+ fields before entering amount.

**Solution:** Progressive disclosure — show fields as needed.

```
┌─────────────────────────────────────┐
│  Add Transaction                    │
│                                     │
│  Account                            │
│  ┌─────────────────────────────┐   │
│  │  Slice Salary           ▼   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Type                               │
│  ┌──────┐ ┌──────┐ ┌──────┐       │
│  │Income│ │Expense│ │Transfer│      │
│  └──────┘ └──────┘ └──────┘       │
│                                     │
│  Amount                             │
│  ┌─────────────────────────────┐   │
│  │  ₹ 60,000                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Category                           │
│  ┌─────────────────────────────┐   │
│  │  Salary                 ▼   │   │
│  └─────────────────────────────┘   │
│                                     │
│  Date                               │
│  ┌─────────────────────────────┐   │
│  │  Today  |  Yesterday  | 2d  │   │
│  └─────────────────────────────┘   │
│                                     │
│  Description (optional)             │
│  ┌─────────────────────────────┐   │
│  │  Monthly salary             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  + Add more details         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │       Save Transaction      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Progressive Disclosure:**
- **Step 1:** Account + Type + Amount (required)
- **Step 2:** Category + Date (required)
- **Step 3:** Description (optional)
- **Step 4:** "Add more details" expands to:
  - Merchant
  - Tags
  - Notes
  - Receipt image
  - Recurring setup

**Type-Specific Fields:**
- **Transfer:** Counterpart account picker appears
- **Investment:** NAV + Units fields appear
- **EMI Purchase:** Tenure selector + monthly preview appears
- **FD Create:** Rate + Maturity date appear

### 4. Transactions List (Redesigned)

**Problem:** Current list shows all transactions flat. Hard to find specific ones.

**Solution:** Grouped by date, with swipe actions.

```
┌─────────────────────────────────────┐
│  Transactions          [Filter ▼]   │
├─────────────────────────────────────┤
│  Today                               │
│  ┌─────────────────────────────┐   │
│  │ 🟢 Salary        +₹60,000  │   │
│  │    Slice Salary • 10:30 AM  │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ 🔴 Swiggy        -₹450     │   │
│  │    Food • 1:15 PM           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Yesterday                          │
│  ┌─────────────────────────────┐   │
│  │ 🔄 Slice → Axis  ₹15,000   │   │
│  │    CC Payment • 6:00 PM     │   │
│  └─────────────────────────────┘   │
│                                     │
│  This Week                          │
│  ┌─────────────────────────────┐   │
│  │ 🟣 SIP          -₹5,000    │   │
│  │    UTI Nifty 50 • Mon       │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Features:**
- **Date grouping:** Today, Yesterday, This Week, Earlier
- **Color coding:** Green = income, Red = expense, Blue = transfer, Purple = investment
- **Swipe left:** Delete (with confirmation)
- **Swipe right:** Edit
- **Long press:** Show details

### 5. Settings Screen (Functional)

**Problem:** Current Settings is placeholder text.

**Solution:** Real settings with account management.

```
┌─────────────────────────────────────┐
│  Settings                           │
├─────────────────────────────────────┤
│  Accounts                           │
│  ┌─────────────────────────────┐   │
│  │ Slice Salary      Savings   │   │
│  │ Kotak             Savings   │   │
│  │ Slice CC          Credit    │   │
│  │ Axis CC           Credit    │   │
│  │ + Add Account               │   │
│  └─────────────────────────────┘   │
│                                     │
│  Tax                                │
│  ┌─────────────────────────────┐   │
│  │ Regime: [Old] [New]         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Data                               │
│  ┌─────────────────────────────┐   │
│  │ Export CSV                  │   │
│  │ Import CSV                  │   │
│  │ Clear Demo Data             │   │
│  └─────────────────────────────┘   │
│                                     │
│  About                              │
│  ┌─────────────────────────────┐   │
│  │ Version 0.1.0               │   │
│  │ Test Mode: [Toggle]         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 6. Empty States

**Problem:** When there's no data, screens are blank.

**Solution:** Helpful empty states with actions.

```
┌─────────────────────────────────────┐
│                                     │
│           💰                        │
│                                     │
│     No transactions yet             │
│                                     │
│  Add your first transaction to      │
│  start tracking your finances.      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │    Add Transaction          │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

**Empty State Types:**
- **No transactions:** "Add your first transaction"
- **No accounts:** "Set up your accounts"
- **No category matches:** "No transactions match this filter"
- **No search results:** "No transactions found"

---

## Component Library

### 1. AccountCard

```typescript
interface AccountCardProps {
  account: Account;
  onPress?: () => void;
  showBalance?: boolean;
}

// Visual:
// ┌─────────────────────────────┐
// │ 🏦 Slice Salary      ₹1.05L │
// │    Savings • Slice           │
// └─────────────────────────────┘
```

### 2. KpiCard

```typescript
interface KpiCardProps {
  label: string;
  value: number;
  icon: string;
  trend?: { value: number; isPositive: boolean };
}

// Visual:
// ┌──────────┐
// │ 💰       │
// │ ₹60,000  │
// │ Income   │
// │ ↑ 12%    │
// └──────────┘
```

### 3. TransactionRow

```typescript
interface TransactionRowProps {
  transaction: Transaction;
  account?: Account;
  counterpartAccount?: Account;
  onPress?: () => void;
  onLongPress?: () => void;
}

// Visual:
// ┌─────────────────────────────┐
// │ 🟢 Salary        +₹60,000  │
// │    Slice Salary • 10:30 AM  │
// └─────────────────────────────┘
```

### 4. ProgressBar

```typescript
interface ProgressBarProps {
  value: number;      // 0-100
  color: string;
  height?: number;
}

// Visual:
// ████████░░░░░░ 29%
```

### 5. EmptyState

```typescript
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
}

// Visual:
//           💰
//     No transactions yet
//  Add your first transaction
//     [Add Transaction]
```

### 6. DateQuickSelect

```typescript
interface DateQuickSelectProps {
  selected: string;
  onSelect: (date: string) => void;
}

// Visual:
// [Today] [Yesterday] [2 days ago]
```

---

## Animation Guidelines

### 1. Page Transitions
- **Push:** Slide from right (300ms ease-out)
- **Pop:** Slide to right (250ms ease-in)
- **Modal:** Slide up from bottom (350ms spring)

### 2. List Animations
- **Add item:** Fade in + slide down (250ms)
- **Remove item:** Fade out + slide up (200ms)
- **Reorder:** Spring animation (300ms)

### 3. Micro-interactions
- **Button press:** Scale down to 0.95 (100ms)
- **Toggle:** Slide thumb (200ms spring)
- **Pull to refresh:** Rotate icon (continuous)

### 4. Number Animations
- **Balance changes:** Count up/down (500ms)
- **KPI updates:** Fade + scale (200ms)

---

## Responsive Design

### Breakpoints
- **Small:** < 375px (iPhone SE)
- **Medium:** 375-428px (iPhone 12/13)
- **Large:** > 428px (iPhone Pro Max)

### Layout Rules
- **KPIs:** 2 columns on small, 3 on medium+, full width on large
- **Lists:** Full width always
- **Cards:** Full width with 16px padding
- **Touch targets:** Minimum 44px height

---

## Accessibility

### Contrast Ratios
- **Text on background:** 4.5:1 minimum
- **Text on surface:** 4.5:1 minimum
- **Icons on background:** 3:1 minimum

### Screen Reader
- All interactive elements have `accessibilityLabel`
- State changes announced with `accessibilityLiveRegion`
- Logical focus order

### Dynamic Type
- Support iOS Dynamic Type
- Android font scaling

---

## Implementation Priority

### Phase 1: Core Design System (Week 1)
1. Update color tokens with account-specific colors
2. Add typography scale for amounts
3. Create AccountCard component
4. Create KpiCard component

### Phase 2: Dashboard Redesign (Week 2)
1. Implement visual hierarchy
2. Add CC utilisation bars
3. Add empty states
4. Add pull-to-refresh animation

### Phase 3: Transaction Form (Week 3)
1. Implement progressive disclosure
2. Add date quick-select
3. Add type-specific field animations
4. Add validation feedback

### Phase 4: Transactions List (Week 4)
1. Implement date grouping
2. Add swipe actions
3. Add color coding
4. Add search/filter UI

### Phase 5: Settings & Onboarding (Week 5)
1. Implement step-by-step onboarding
2. Implement functional settings
3. Add account management
4. Add empty states

### Phase 6: Polish (Week 6)
1. Add micro-interactions
2. Add page transitions
3. Add number animations
4. Accessibility audit
