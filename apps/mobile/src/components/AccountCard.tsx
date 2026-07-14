import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../design-system/theme/ThemeProvider';
import type { Account } from '@finance/engine';

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
  showBalance?: boolean;
}

function getAccountColor(type: string, colors: any): string {
  switch (type) {
    case 'savings': return colors.savings;
    case 'checking': return colors.savings;
    case 'credit_card': return colors.creditCard;
    case 'emi_card': return colors.emiCard;
    case 'investment': return colors.investment;
    case 'fixed_deposit': return colors.fd;
    case 'cash': return colors.cash;
    default: return colors.primary;
  }
}

function formatINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)} L`;
  }
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function AccountCard({ account, onPress, showBalance = true }: AccountCardProps) {
  const theme = useTheme();
  const accountColor = getAccountColor(account.type, theme.colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{account.icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={[styles.type, { color: theme.colors.textSecondary }]}>
          {account.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
      </View>
      {showBalance && (
        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, { color: account.balance >= 0 ? theme.colors.text : theme.colors.danger }]}>
            {account.balance >= 0 ? formatINR(account.balance) : `-${formatINR(Math.abs(account.balance))}`}
          </Text>
          {account.type === 'credit_card' && account.creditLimit && (
            <Text style={[styles.limit, { color: theme.colors.textSecondary }]}>
              / {formatINR(account.creditLimit)}
            </Text>
          )}
        </View>
      )}
      <View style={[styles.indicator, { backgroundColor: accountColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  type: {
    fontSize: 12,
    fontWeight: '400',
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  limit: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  indicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginLeft: 12,
  },
});
