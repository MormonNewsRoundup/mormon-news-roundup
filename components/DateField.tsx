import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (yyyyMmDd: string) => void;
};

function dateFromInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function inputFromDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(Platform.OS === 'ios');

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      {Platform.OS === 'ios' ? (
        <DateTimePicker
          value={dateFromInput(value)}
          mode="date"
          display="compact"
          accentColor={theme.header}
          onValueChange={(_event, date) => onChange(inputFromDate(date))}
        />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label} ${value}`}
            onPress={() => setOpen(true)}
            style={[styles.button, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
          </Pressable>
          {open ? (
            <DateTimePicker
              value={dateFromInput(value)}
              mode="date"
              display="default"
              onValueChange={(_event, date) => {
                setOpen(false);
                onChange(inputFromDate(date));
              }}
              onDismiss={() => setOpen(false)}
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, fontWeight: '700' },
  button: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  value: { fontSize: 15, fontWeight: '700' },
});
