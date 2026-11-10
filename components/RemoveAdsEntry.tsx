import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { REMOVE_ADS_BUTTON_LABEL } from '@/constants/config';

/** Sits with the banner so Remove Ads is visible even when the ad request fails. */
export function RemoveAdsEntry() {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={REMOVE_ADS_BUTTON_LABEL}
      onPress={() => router.navigate('/settings' as Href)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={[styles.label, { color: theme.link }]}>{REMOVE_ADS_BUTTON_LABEL}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  label: { fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.7 },
});
