import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/components/useTheme';
import { serifFamily } from '@/constants/theme';

type BrandHeaderProps = {
  title: string;
  subtitle?: string;
};

export function BrandHeader({ title, subtitle }: BrandHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: theme.header }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.header }}>
        <View style={styles.inner}>
          <Text style={[styles.kicker, { color: theme.gold }]}>MORMON NEWS ROUNDUP</Text>
          <Text style={[styles.title, { color: theme.headerText }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: theme.gold }]}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.rule, { backgroundColor: theme.gold }]} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  inner: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
    gap: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: {
    fontFamily: serifFamily,
    fontSize: 28,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 2,
  },
  rule: {
    height: 3,
  },
});
