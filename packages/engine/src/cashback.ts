// ── Credit Card Cashback & Rewards Engine ──────────────────
// All monetary values in minor units (paise for INR)

export type CardProgram = 'slice_monies' | 'axis_supermoney';

export interface CashbackRule {
  program: CardProgram;
  description: string;
  excludeMCcodes?: string[];
}

export interface TransactionInput {
  amountPaise: number;
  merchant?: string;
  mccCode?: string;
  isEMI?: boolean;
  isInternational?: boolean;
  isWalletLoad?: boolean;
  isFuel?: boolean;
  isInsurance?: boolean;
  isRent?: boolean;
  isEducation?: boolean;
  isGovernment?: boolean;
  isGambling?: boolean;
  isCashWithdrawal?: boolean;
  isUPI?: boolean;
  upiApp?: string;
}

export interface CashbackResult {
  program: CardProgram;
  earnedPaise: number;
  description: string;
  details: string[];
}

// ── Slice Monies ──────────────────────────────────────────

const SLICE_EXCLUDED_MCC = new Set([
  '5541', '5542', '5983', '5172', // fuel
  '6513', // rent
  '6540', '6539', // wallet
  '5960', '6300', '6381', '3429', // insurance
  '8244', '8299', '8211', '8241', '8220', '8249', // education
  '6012', '6541', '6051', // financial institutions
  '9311', '9399', // government
  '0763', // agriculture
  '5816', '7995', '7801', '7800', '7802', // gambling
  '6010', // cash withdrawal
]);

function isSliceExcluded(txn: TransactionInput): boolean {
  if (txn.isEMI) return true;
  if (txn.isWalletLoad) return true;
  if (txn.isInternational) return true;
  if (txn.mccCode && SLICE_EXCLUDED_MCC.has(txn.mccCode)) return true;
  return false;
}

export function calculateSliceMonies(txn: TransactionInput): CashbackResult {
  const details: string[] = [];

  if (isSliceExcluded(txn)) {
    details.push('Transaction excluded from monies accrual');
    return { program: 'slice_monies', earnedPaise: 0, description: 'Excluded', details };
  }

  const monies = txn.amountPaise;
  details.push(`Earned ${monies} monies (1 monies per ₹1 spent)`);
  details.push(`Redemption value: ₹${(monies / 100).toFixed(0)} at 1% rate`);

  return {
    program: 'slice_monies',
    earnedPaise: monies,
    description: `${monies} monies earned`,
    details,
  };
}

export function getSliceMoniesRedemptionValue(moniesBalance: number): { rate: number; valuePaise: number } {
  if (moniesBalance <= 300000) {
    return { rate: 0.01, valuePaise: Math.round(moniesBalance * 0.01) };
  } else if (moniesBalance <= 500000) {
    return { rate: 0.015, valuePaise: Math.round(moniesBalance * 0.015) };
  } else {
    return { rate: 0.02, valuePaise: Math.round(moniesBalance * 0.02) };
  }
}

// ── Axis SuperMoney ──────────────────────────────────────

const AXIS_MIN_SPEND_PAISE = 10000;
const SUPERMONEY_UPI_APP = 'super.money';

export function calculateAxisSuperMoney(
  txn: TransactionInput,
  otherCashbackPaiseThisCycle: number,
): CashbackResult {
  const details: string[] = [];

  if (txn.amountPaise < AXIS_MIN_SPEND_PAISE) {
    details.push(`Spend below ₹100 minimum — no cashback`);
    return { program: 'axis_supermoney', earnedPaise: 0, description: 'Below minimum', details };
  }

  const isSuperMoneyUPI = txn.isUPI && txn.upiApp === SUPERMONEY_UPI_APP;
  let earnedPaise = 0;

  if (isSuperMoneyUPI) {
    const uncappedCashback = Math.round(txn.amountPaise * 0.03);
    let cap = otherCashbackPaiseThisCycle;
    if (otherCashbackPaiseThisCycle < 10000 && uncappedCashback > 10000) {
      cap = 10000;
    }
    earnedPaise = Math.min(uncappedCashback, cap);
    details.push(`3% on ₹${(txn.amountPaise / 100).toFixed(0)} super.money UPI = ₹${(uncappedCashback / 100).toFixed(0)}`);
    details.push(`Capped at ₹${(cap / 100).toFixed(0)} (other cashback: ₹${(otherCashbackPaiseThisCycle / 100).toFixed(0)})`);
  } else {
    earnedPaise = Math.round(txn.amountPaise * 0.01);
    details.push(`1% on ₹${(txn.amountPaise / 100).toFixed(0)} = ₹${(earnedPaise / 100).toFixed(0)}`);
  }

  return {
    program: 'axis_supermoney',
    earnedPaise,
    description: `₹${(earnedPaise / 100).toFixed(0)} cashback`,
    details,
  };
}

// ── Unified Calculator ───────────────────────────────────

export function calculateCashback(
  program: CardProgram,
  txn: TransactionInput,
  otherCashbackPaiseThisCycle: number = 0,
): CashbackResult {
  switch (program) {
    case 'slice_monies':
      return calculateSliceMonies(txn);
    case 'axis_supermoney':
      return calculateAxisSuperMoney(txn, otherCashbackPaiseThisCycle);
    default:
      return { program, earnedPaise: 0, description: 'Unknown program', details: [] };
  }
}
