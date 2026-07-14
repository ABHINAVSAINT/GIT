import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../design-system/theme/ThemeProvider';
import type { Investment } from '@finance/engine';

interface PortfolioSummaryProps {
  investments: Investment[];
}

function formatINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(2)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(2)} L`;
  }
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function PortfolioSummary({ investments }: PortfolioSummaryProps) {
  const theme = useTheme();

  if (investments.length === 0) {
    return null;
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPct = totalInvested > 0 ? ((totalGain / totalInvested) * 100) : 0;

  // Group by type
  const byType: Record<string, { invested: number; current: number; count: number }> = {};
  for (const inv of investments) {
    const entry = byType[inv.type] ?? { invested: 0, current: 0, count: 0 };
    entry.invested += inv.investedAmount;
    entry.current += inv.currentValue;
    entry.count += 1;
    byType[inv.type] = entry;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Portfolio Summary</Text>
      
      {/* Total */}
      <View style={[styles.totalRow, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Invested</Text>
          <Text style={[styles.totalValue, { color: theme.colors.text }]}>{formatINR(totalInvested)}</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Current</Text>
          <Text style={[styles.totalValue, { color: theme.colors.text }]}>{formatINR(totalCurrent)}</Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Return</Text>
          <Text style={[styles.totalValue, { color: totalGain >= 0 ? theme.colors.success : theme.colors.danger }]}>
            {formatPercent(totalGainPct)}
          </Text>
        </View>
      </View>

      {/* By Type */}
      {Object.entries(byType).map(([type, data]) => {
        const gain = data.current - data.invested;
        const gainPct = data.invested > 0 ? ((gain / data.invested) * 100) : 0;
        return (
          <View key={type} style={[styles.typeRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.typeInfo}>
              <Text style={[styles.typeName, { color: theme.colors.text }]}>
                {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text style={[styles.typeCount, { color: theme.colors.textSecondary }]}>
                {data.count} {data.count === 1 ? 'fund' : 'funds'}
              </Text>
            </View>
            <View style={styles.typeValues}>
              <Text style={[styles.typeValue, { color: theme.colors.text }]}>{formatINR(data.current)}</Text>
              <Text style={[styles.typeGain, { color: gain >= 0 ? theme.colors.success : theme.colors.danger }]}>
                {formatPercent(gainPct)}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Top Holdings */}
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Top Holdings</Text>
      {investments
        .sort((a, b) => b.currentValue - a.currentValue)
        .slice(0, 5)
        .map((inv) => {
          const gain = inv.currentValue - inv.investedAmount;
          const gainPct = inv.investedAmount > 0 ? ((gain / inv.investedAmount) * 100) : 0;
          return (
            <View key={inv.id} style={[styles.holdingRow, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.holdingInfo}>
                <Text style={[styles.holdingName, { color: theme.colors.text }]} numberOfLines={1}>
                  {inv.name}
                </Text>
                <Text style={[styles.holdingUnits, { color: theme.colors.textSecondary }]}>
                  {inv.quantity.toFixed(3)} units
                </Text>
              </View>
              <View style={styles.holdingValues}>
                <Text style={[styles.holdingValue, { color: theme.colors.text }]}>{formatINR(inv.currentValue)}</Text>
                <Text style={[styles.holdingGain, { color: gain >= 0 ? theme.colors.success : theme.colors.danger }]}>
                  {formatPercent(gainPct)}
                </Text>
              </View>
            </View>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalItem: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  typeCount: {
    fontSize: 12,
  },
  typeValues: {
    alignItems: 'flex-end',
  },
  typeValue: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  typeGain: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  holdingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingName: {
    fontSize: 14,
    fontWeight: '500',
  },
  holdingUnits: {
    fontSize: 12,
  },
  holdingValues: {
    alignItems: 'flex-end',
  },
  holdingValue: {
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  holdingGain: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
