import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/components/useTheme';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (yyyyMmDd: string) => void;
};

/** The browser date control. iOS uses the native picker in DateField.tsx. */
export function DateField({ label, value, onChange }: DateFieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        style={{
          font: 'inherit',
          fontSize: 15,
          fontWeight: 700,
          color: theme.text,
          backgroundColor: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: 10,
          minHeight: 36,
          padding: '4px 8px',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 13, fontWeight: '700' },
});
