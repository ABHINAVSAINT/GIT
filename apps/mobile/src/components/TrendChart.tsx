import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../design-system/theme/ThemeProvider';

interface TrendDataPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  title: string;
  color?: string;
  height?: number;
}

function formatINR(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  if (rupees >= 10000000) {
    return `₹${(rupees / 10000000).toFixed(1)} Cr`;
  }
  if (rupees >= 100000) {
    return `₹${(rupees / 100000).toFixed(1)} L`;
  }
  return `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function TrendChart({ data, title, color, height = 200 }: TrendChartProps) {
  const theme = useTheme();
  const chartColor = color || theme.colors.primary;

  if (data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface, height }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No data yet</Text>
        </View>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;

  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const valueRange = maxValue - minValue || 1;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      
      <View style={[styles.chartArea, { height }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={[styles.axisLabel, { color: theme.colors.textSecondary }]}>
            {formatINR(maxValue)}
          </Text>
          <Text style={[styles.axisLabel, { color: theme.colors.textSecondary }]}>
            {formatINR(minValue)}
          </Text>
        </View>

        {/* Chart bars */}
        <View style={styles.barsContainer}>
          {data.map((point, index) => {
            const barHeight = ((point.value - minValue) / valueRange) * (height - 40);
            return (
              <View key={index} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 4),
                      backgroundColor: chartColor,
                      opacity: 0.8,
                    },
                  ]}
                />
                <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {point.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Latest</Text>
          <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
            {formatINR(data[data.length - 1].value)}
          </Text>
        </View>
        {data.length >= 2 && (
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Change</Text>
            <Text style={[
              styles.summaryValue,
              { color: data[data.length - 1].value >= data[0].value ? theme.colors.success : theme.colors.danger }
            ]}>
              {data[data.length - 1].value >= data[0].value ? '+' : ''}
              {formatINR(data[data.length - 1].value - data[0].value)}
            </Text>
          </View>
        )}
      </View>
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
  chartArea: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  yAxis: {
    width: 60,
    justifyContent: 'space-between',
    marginRight: 8,
  },
  axisLabel: {
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: '80%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    marginTop: 4,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
