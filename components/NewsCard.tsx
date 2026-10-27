import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { thumbnailSource } from '@/components/thumbnails';
import { useTheme } from '@/components/useTheme';
import { badgeColors, serifFamily } from '@/constants/theme';
import { formatPublishedDate } from '@/lib/format';
import { openItem, shareItem } from '@/lib/links';
import { typeLabel, type FeedItem } from '@/lib/types';

const REDDIT_ORANGE = '#FF4500';

export function NewsCard({ item }: { item: FeedItem }) {
  const theme = useTheme();
  const thumbUrl = item.thumbnailUrl?.trim() ?? '';
  const source = thumbnailSource(thumbUrl);
  const [imageFailed, setImageFailed] = useState(!source);
  const badge = badgeColors[item.type] ?? badgeColors.article;
  const published = formatPublishedDate(item.publishedAt);
  const kind = typeLabel(item.type);
  const meta = [item.source, kind, published].filter(Boolean).join(' · ');
  const redditPlaceholder = item.type === 'reddit' && (!source || imageFailed);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${meta}. ${item.title}`}
        onPress={() => void openItem(item)}
        style={({ pressed }) => pressed && styles.pressed}>
        <View
          style={[
            styles.thumbWrap,
            { backgroundColor: redditPlaceholder ? REDDIT_ORANGE : theme.header },
          ]}>
          {source && !imageFailed ? (
            <Image
              source={source}
              style={styles.thumb}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              onError={() => setImageFailed(true)}
            />
          ) : (
            <View style={styles.fallback}>
              {redditPlaceholder ? (
                <Text style={styles.redditMark}>r/</Text>
              ) : (
                <>
                  {thumbUrl.startsWith('sample:') ? (
                    <Text style={styles.fallbackKicker}>SAMPLE</Text>
                  ) : null}
                  <Text style={styles.fallbackLabel}>{typeLabel(item.type).toUpperCase()}</Text>
                </>
              )}
            </View>
          )}
          <View style={[styles.badge, { backgroundColor: badge.background }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{typeLabel(item.type)}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: theme.muted }]}>{meta}</Text>
            {item.paywalled ? (
              <View
                style={styles.lock}
                accessibilityLabel="May be paywalled"
                accessibilityRole="image">
                <Icon ios="lock.fill" android="lock" color={theme.muted} size={14} />
              </View>
            ) : null}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
          <Text style={[styles.summary, { color: theme.muted }]}>{item.summary}</Text>
        </View>
      </Pressable>
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${item.title}`}
          hitSlop={8}
          onPress={() => void shareItem(item)}
          style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
          <Icon ios="square.and.arrow.up" android="share" color={theme.link} size={18} />
          <Text style={[styles.shareText, { color: theme.link }]}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  pressed: {
    opacity: 0.88,
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    justifyContent: 'center',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fallbackKicker: {
    color: '#F5E6B3',
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  fallbackLabel: {
    color: '#F6F1E7',
    fontFamily: serifFamily,
    fontSize: 28,
  },
  redditMark: {
    color: '#FFFFFF',
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -1,
  },
  badge: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  body: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  meta: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  lock: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: serifFamily,
    fontSize: 20,
    lineHeight: 26,
  },
  summary: {
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  share: {
    minHeight: 44,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  shareText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
