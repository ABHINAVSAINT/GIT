export const colors = {
  // Primary palette
  primary: '#0EA5E9',
  primaryDark: '#0284C7',
  primaryLight: '#38BDF8',

  // Semantic
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',

  // Account type colors
  savings: '#22C55E',      // Green — money you have
  creditCard: '#EF4444',   // Red — money you owe
  emiCard: '#F59E0B',      // Amber — EMI outstanding
  investment: '#6366F1',   // Purple — growth
  fd: '#14B8A6',           // Teal — locked money
  cash: '#8B5CF6',         // Violet — physical cash

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',
  gray950: '#020617',

  // Semantic backgrounds
  incomeBg: 'rgba(34, 197, 94, 0.1)',
  expenseBg: 'rgba(239, 68, 68, 0.1)',
  transferBg: 'rgba(99, 102, 241, 0.1)',
  investmentBg: 'rgba(99, 102, 241, 0.1)',

  // Chart
  chart1: '#0EA5E9',
  chart2: '#22C55E',
  chart3: '#F59E0B',
  chart4: '#EF4444',
  chart5: '#8B5CF6',
  chart6: '#EC4899',
  chart7: '#14B8A6',
  chart8: '#F97316',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 18 },
  mono: { fontSize: 16, fontWeight: '500' as const, fontFamily: 'monospace' as const },
  // Amount-specific typography
  hero: { fontSize: 36, fontWeight: '700' as const, lineHeight: 44, fontVariant: ['tabular-nums' as const] },
  amountLarge: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, fontVariant: ['tabular-nums' as const] },
  amountMedium: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, fontVariant: ['tabular-nums' as const] },
  amountSmall: { fontSize: 14, fontWeight: '500' as const, lineHeight: 18, fontVariant: ['tabular-nums' as const] },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
