import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/components/useTheme';
import { DISCLAIMER } from '@/constants/config';

/**
 * Last line of each tab's scroll content. A bottom ad banner, when one
 * exists, sits below this line.
 */
export function ScreenDisclaimer() {
  const theme = useTheme();
  return <Text style={[styles.text, { color: theme.muted }]}>{DISCLAIMER}</Text>;
}

const styles = StyleSheet.create({
  text: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 14,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});
