import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../design-system/theme/ThemeProvider';

interface KpiCardProps {
  label: string;
  value: number;
  icon: string;
  trend?: { value: number; isPositive: boolean };
}

function formatINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function KpiCard({ label, value, icon, trend }: KpiCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color: value >= 0 ? theme.colors.text : theme.colors.danger }]}>
        {value >= 0 ? formatINR(value) : `-${formatINR(Math.abs(value))}`}
      </Text>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      {trend && (
        <Text style={[styles.trend, { color: trend.isPositive ? theme.colors.success : theme.colors.danger }]}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
  },
  trend: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
});
