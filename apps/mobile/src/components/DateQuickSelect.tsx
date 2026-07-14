import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../design-system/theme/ThemeProvider';

interface DateQuickSelectProps {
  selected: string;
  onSelect: (date: string) => void;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]!;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0]!;
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]!;
}

const QUICK_OPTIONS = [
  { label: 'Today', getValue: getToday },
  { label: 'Yesterday', getValue: getYesterday },
  { label: '2 days ago', getValue: () => getDaysAgo(2) },
];

export function DateQuickSelect({ selected, onSelect }: DateQuickSelectProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      {QUICK_OPTIONS.map((option) => {
        const value = option.getValue();
        const isSelected = selected === value;
        return (
          <Pressable
            key={option.label}
            onPress={() => onSelect(value)}
            style={[
              styles.button,
              {
                backgroundColor: isSelected ? theme.colors.primary : theme.colors.surfaceVariant,
                borderColor: isSelected ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.text,
                { color: isSelected ? '#FFFFFF' : theme.colors.text },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});
