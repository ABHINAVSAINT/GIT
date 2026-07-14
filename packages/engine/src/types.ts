// ── Domain Types ──────────────────────────────────────────
// All monetary values in minor units (paise for INR) unless documented otherwise

export type AccountType =
  | 'checking' | 'savings' | 'credit_card' | 'loan'
  | 'investment' | 'crypto' | 'cash' | 'other'
  | 'emi_card' | 'fixed_deposit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  currency: string;
  balance: number;
  balanceAsOf: string;
  creditLimit?: number;
  statementDay?: number;
  dueDay?: number;
  apr?: number;
  color: string;
  icon: string;
  isHidden: boolean;
  isArchived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  investmentMode?: 'sip' | 'onetime';
  location?: string;
  subType?: string;
  emiTenure?: number;
  emiMonthlyAmount?: number;
  fdRate?: number;
  fdMaturityDate?: string;
  fdMaturityAmount?: number;
  fdStartDate?: string;
}

export type TransactionType =
  | 'income' | 'expense' | 'transfer' | 'investment'
  | 'redemption' | 'dividend' | 'interest' | 'fee'
  | 'fd_create' | 'fd_mature' | 'emi_purchase' | 'emi_payment';

export type TransactionStatus = 'pending' | 'cleared' | 'reconciled' | 'flagged';

export interface Transaction {
  id: string;
  accountId: string;
  counterpartAccountId?: string;
  amount: number;
  currency: string;
  type: TransactionType;
  date: string;
  postedDate?: string;
  categoryId: string;
  subcategoryId?: string;
  tags: string[];
  merchant?: string;
  description: string;
  notes?: string;
  receiptImageUri?: string;
  recurringRuleId?: string;
  investmentId?: string;
  units?: number;
  navOrPrice?: number;
  status: TransactionStatus;
  isRecurring: boolean;
  isTaxRelevant: boolean;
  createdAt?: string;
  updatedAt?: string;
  version?: number;
  cashbackPaise?: number;
  cashbackProgram?: string;
  cashbackDescription?: string;
  emiTenure?: number;
  emiNumber?: number;
  fdRate?: number;
  fdMaturityDate?: string;
  interestRate?: number;
}

export type InvestmentType =
  | 'mutual_fund' | 'stock' | 'etf' | 'bond'
  | 'fd' | 'rd' | 'ppf' | 'epf' | 'nps'
  | 'gold' | 'silver' | 'crypto' | 'real_estate' | 'other';

export interface Investment {
  id: string;
  accountId: string;
  name: string;
  type: InvestmentType;
  symbol?: string;
  isin?: string;
  quantity: number;
  averageCost: number;
  investedAmount: number;
  currentPrice: number;
  currentPriceAsOf: string;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
  xirr?: number;
  twrr?: number;
  absoluteReturn: number;
  annualizedReturn: number;
  schemeCode?: string;
  folioNumber?: string;
  registrar?: string;
  totalDividends: number;
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cashflow {
  date: Date;
  amount: number;
}

export interface PortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPct: number;
  xirr: number;
  twrr?: number;
  absoluteReturn: number;
  annualizedReturn: number;
  topHoldings: Array<{ name: string; value: number; weight: number }>;
  allocation: Record<string, number>;
}

export interface Insight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  actionLabel?: string;
  categoryId?: string;
  dismissed: boolean;
}

export type InsightType =
  | 'spending_anomaly'
  | 'subscription_detected'
  | 'budget_breach'
  | 'recurring_charge_change'
  | 'low_balance'
  | 'unusual_category'
  | 'savings_opportunity'
  | 'investment_rebalance'
  | 'goal_progress'
  | 'tax_optimization';

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  targetDate: string;
  startDate: string;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate?: number;
  linkedInvestmentIds: string[];
  status: GoalStatus;
  probabilityOfSuccess?: number;
  createdAt: string;
  updatedAt: string;
}

export type GoalType = 'retirement' | 'house' | 'education' | 'emergency' | 'vacation' | 'vehicle' | 'custom';
export type GoalStatus = 'on_track' | 'behind' | 'at_risk' | 'achieved' | 'paused';

export interface Loan {
  id: string;
  accountId: string;
  name: string;
  type: LoanType;
  originalPrincipal: number;
  outstandingPrincipal: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  emi: number;
  emiDay: number;
  totalInterestPayable: number;
  totalPaid: number;
  remainingTenureMonths: number;
  payoffDate: string;
  offsetInvestmentIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type LoanType = 'home' | 'personal' | 'auto' | 'education' | 'credit_card' | 'gold' | 'other';

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  type: 'income' | 'expense' | 'transfer' | 'investment';
  icon: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  budgetAmount?: number;
  budgetPeriod?: 'monthly' | 'quarterly' | 'yearly';
}

export interface RecurringRule {
  id: string;
  name: string;
  accountId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  categoryId: string;
  subcategoryId?: string;
  merchant?: string;
  description: string;
  tags: string[];
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate: string;
  endDate?: string;
  occurrences?: number;
  nextRunDate: string;
  lastRunDate?: string;
  isActive: boolean;
  autoCreate: boolean;
  notifyBeforeDays?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AmortizationRow {
  month: number;
  date: string;
  openingBalance: number;
  emi: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

// ── Transaction Type Mapping ──────────────────────────────

export interface TransactionTypeOption {
  type: TransactionType;
  label: string;
  icon: string;
  colorKey: 'danger' | 'success' | 'info' | 'warning' | 'purple';
  fields?: string[];
  requiresCounterpart?: boolean;
  counterpartFilter?: AccountType[];
}

export function getTransactionTypesForAccount(accountType: AccountType): TransactionTypeOption[] {
  switch (accountType) {
    case 'savings':
    case 'checking':
      return [
        { type: 'income', label: 'Income', icon: '💰', colorKey: 'success' },
        { type: 'expense', label: 'Expense', icon: '💸', colorKey: 'danger' },
        { type: 'transfer', label: 'Transfer', icon: '🔄', colorKey: 'info', requiresCounterpart: true, counterpartFilter: ['savings', 'checking', 'credit_card', 'cash'] },
        { type: 'interest', label: 'Interest', icon: '📊', colorKey: 'info', fields: ['interestRate'] },
      ];
    case 'credit_card':
      return [
        { type: 'expense', label: 'Spend', icon: '💳', colorKey: 'danger' },
        { type: 'transfer', label: 'Pay Bill', icon: '🏦', colorKey: 'success', requiresCounterpart: true, counterpartFilter: ['savings', 'checking', 'cash'] },
        { type: 'income', label: 'Refund', icon: '↩️', colorKey: 'info' },
      ];
    case 'emi_card':
      return [
        { type: 'emi_purchase', label: 'EMI Purchase', icon: '🛍️', colorKey: 'danger', fields: ['emiTenure'] },
        { type: 'emi_payment', label: 'EMI Payment', icon: '🏦', colorKey: 'success', requiresCounterpart: true, counterpartFilter: ['savings', 'checking', 'cash'] },
      ];
    case 'investment':
      return [
        { type: 'investment', label: 'Buy', icon: '📈', colorKey: 'success', fields: ['units', 'navOrPrice'] },
        { type: 'redemption', label: 'Sell', icon: '📉', colorKey: 'danger', fields: ['units', 'navOrPrice'] },
        { type: 'dividend', label: 'Dividend', icon: '💰', colorKey: 'success' },
        { type: 'interest', label: 'Interest', icon: '📊', colorKey: 'info' },
      ];
    case 'fixed_deposit':
      return [
        { type: 'fd_create', label: 'Create FD', icon: '🏦', colorKey: 'info', fields: ['fdRate', 'fdMaturityDate'] },
        { type: 'fd_mature', label: 'FD Mature', icon: '✅', colorKey: 'success', requiresCounterpart: true, counterpartFilter: ['savings', 'checking'] },
      ];
    case 'cash':
      return [
        { type: 'income', label: 'Receive', icon: '💵', colorKey: 'success' },
        { type: 'expense', label: 'Spend', icon: '💸', colorKey: 'danger' },
        { type: 'transfer', label: 'Transfer', icon: '🔄', colorKey: 'info', requiresCounterpart: true, counterpartFilter: ['savings', 'checking', 'credit_card', 'cash'] },
      ];
    default:
      return [
        { type: 'income', label: 'Income', icon: '💰', colorKey: 'success' },
        { type: 'expense', label: 'Expense', icon: '💸', colorKey: 'danger' },
        { type: 'transfer', label: 'Transfer', icon: '🔄', colorKey: 'info' },
      ];
  }
}

// ── Balance Calculation ──────────────────────────────────

export function computeBalanceDelta(
  accountType: AccountType,
  transactionType: TransactionType,
  amountPaise: number,
  direction: 'incoming' | 'outgoing' = 'outgoing'
): number {
  // CC refund: outstanding DECREASES (opposite of income)
  if (accountType === 'credit_card' && transactionType === 'income') {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  if (['income', 'dividend', 'interest'].includes(transactionType)) {
    return direction === 'outgoing' ? amountPaise : -amountPaise;
  }

  if (accountType === 'credit_card' && transactionType === 'expense') {
    return direction === 'outgoing' ? amountPaise : -amountPaise;
  }

  if (accountType === 'credit_card' && transactionType === 'transfer') {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  if (accountType === 'emi_card' && transactionType === 'emi_purchase') {
    return direction === 'outgoing' ? amountPaise : -amountPaise;
  }

  if (accountType === 'emi_card' && transactionType === 'emi_payment') {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  if (transactionType === 'investment') {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  if (transactionType === 'redemption') {
    return direction === 'outgoing' ? amountPaise : -amountPaise;
  }

  if (transactionType === 'fd_create') {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  if (transactionType === 'fd_mature') {
    return direction === 'outgoing' ? amountPaise : -amountPaise;
  }

  if (['expense', 'fee'].includes(transactionType)) {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  if (transactionType === 'transfer') {
    return direction === 'outgoing' ? -amountPaise : amountPaise;
  }

  return 0;
}

// ── Cashflow Classification ──────────────────────────────

export function isIncomeType(type: TransactionType): boolean {
  return ['income', 'dividend', 'interest'].includes(type);
}

export function isExpenseType(type: TransactionType): boolean {
  return ['expense', 'fee', 'emi_purchase'].includes(type);
}

export function isTransferType(type: TransactionType): boolean {
  return ['transfer', 'emi_payment', 'fd_create', 'fd_mature'].includes(type);
}

export function isInvestmentType(type: TransactionType): boolean {
  return ['investment', 'redemption'].includes(type);
}
