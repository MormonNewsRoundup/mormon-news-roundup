import { FlatList, StyleSheet, Text, View } from 'react-native';

import { useAppState } from '@/components/AppState';
import { BottomAdSlot } from '@/components/BottomAdSlot';
import { BrandHeader } from '@/components/BrandHeader';
import { NewsCard } from '@/components/NewsCard';
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { useTheme } from '@/components/useTheme';
import { serifFamily } from '@/constants/theme';

export default function SavedScreen() {
  const theme = useTheme();
  const { saved } = useAppState();
  const stories = saved.map((record) => record.item);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <BrandHeader title="Saved" subtitle="On this phone, including offline." />
      {stories.length === 0 ? (
        <View style={styles.fill}>
          <View style={styles.centered}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No saved stories yet</Text>
            <Text style={[styles.body, { color: theme.muted }]}>
              Tap Save on any story in Latest or Search. The headline, summary, and link stay on this
              phone and open without a connection.
            </Text>
          </View>
          <ScreenDisclaimer />
        </View>
      ) : (
        <FlatList
          style={styles.fill}
          data={stories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListFooterComponent={<ScreenDisclaimer />}
          renderItem={({ item }) => <NewsCard item={item} />}
        />
      )}
      <BottomAdSlot />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  list: { paddingTop: 16, paddingBottom: 8, flexGrow: 1 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 10,
  },
  emptyTitle: { fontFamily: serifFamily, fontSize: 26, textAlign: 'center' },
  body: { fontSize: 16, lineHeight: 23, textAlign: 'center' },
});
