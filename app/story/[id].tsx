import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppState } from '@/components/AppState';
import { BottomAdSlot } from '@/components/BottomAdSlot';
import { EpisodePlayer } from '@/components/EpisodePlayer';
import { Icon } from '@/components/Icon';
import { ScreenDisclaimer } from '@/components/ScreenDisclaimer';
import { YouTubeEmbed } from '@/components/YouTubeEmbed';
import { useTheme } from '@/components/useTheme';
import { badgeColors, serifFamily } from '@/constants/theme';
import { formatPublishedDate } from '@/lib/format';
import { openInAppBrowser, shareItem } from '@/lib/links';
import { resolveAudio, youtubeVideoId, type ResolvedAudio } from '@/lib/playback';
import { extractArticleText } from '@/lib/reader';
import { findStory, rememberedStory } from '@/lib/stories';
import { textMultiplier } from '@/lib/textSize';
import { typeLabel, type FeedItem } from '@/lib/types';

export default function StoryScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { saved, isSaved, toggleSaved, textSize } = useAppState();
  const scale = textMultiplier(textSize);
  const [item, setItem] = useState<FeedItem | null>(() => (id ? rememberedStory(id) : null));
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id || item) return;
    const stored = saved.find((record) => record.item.id === id)?.item;
    if (stored) setItem(stored);
  }, [id, item, saved]);

  useEffect(() => {
    if (!id || item) return;
    let cancelled = false;
    void findStory(id).then((found) => {
      if (cancelled) return;
      if (found) setItem(found);
      else setMissing(true);
    });
    return () => {
      cancelled = true;
    };
  }, [id, item]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.header }}>
        <View style={[styles.top, { backgroundColor: theme.header }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={styles.back}>
            <Icon ios="chevron.left" android="chevron_left" color={theme.gold} size={20} />
            <Text style={[styles.backText, { color: theme.gold }]}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      {!item ? (
        <View style={styles.fill}>
          <View style={styles.centered}>
            {missing ? (
              <Text style={[styles.missing, { color: theme.text }]}>This story isn’t on this phone.</Text>
            ) : (
              <ActivityIndicator color={theme.header} />
            )}
          </View>
          <ScreenDisclaimer />
        </View>
      ) : (
        <StoryBody
          item={item}
          saved={isSaved(item.id)}
          scale={scale}
          onSave={() => void toggleSaved(item)}
        />
      )}
      <BottomAdSlot />
    </View>
  );
}

function StoryBody({
  item,
  saved,
  scale,
  onSave,
}: {
  item: FeedItem;
  saved: boolean;
  scale: number;
  onSave: () => void;
}) {
  const theme = useTheme();
  const videoId = youtubeVideoId(item.url);
  const wantsAudio = !videoId && (item.type === 'podcast' || Boolean(item.audioUrl?.trim()));
  const published = formatPublishedDate(item.publishedAt);
  const badge = badgeColors[item.type] ?? badgeColors.article;

  return (
    <ScrollView style={styles.fill} contentContainerStyle={styles.content}>
      {videoId ? <YouTubeEmbed videoId={videoId} /> : null}
      {wantsAudio ? <AudioBlock item={item} /> : null}
      <View style={styles.copy}>
        <View style={[styles.badge, { backgroundColor: badge.background }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{typeLabel(item.type)}</Text>
        </View>
        <Text style={[styles.meta, { color: theme.muted }]}>
          {[item.source, published].filter(Boolean).join(' · ')}
        </Text>
        <Text style={[styles.title, { color: theme.text, fontSize: 28 * scale, lineHeight: 34 * scale }]}>
          {item.title}
        </Text>
        <Text style={[styles.summary, { color: theme.text, fontSize: 17 * scale, lineHeight: 25 * scale }]}>
          {item.summary}
        </Text>
        {item.type === 'article' ? <ArticleText url={item.url} scale={scale} /> : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onSave} style={styles.action}>
            <Icon ios={saved ? 'bookmark.fill' : 'bookmark'} android="bookmark" color={theme.link} size={18} />
            <Text style={[styles.actionText, { color: theme.link }]}>{saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void shareItem(item)} style={styles.action}>
            <Icon ios="square.and.arrow.up" android="share" color={theme.link} size={18} />
            <Text style={[styles.actionText, { color: theme.link }]}>Share</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => void openInAppBrowser(item.url)}
          style={({ pressed }) => [styles.original, { backgroundColor: theme.header }, pressed && styles.pressed]}>
          <Text style={[styles.originalText, { color: theme.gold }]}>{originalLabel(item.type, Boolean(videoId))}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: theme.muted }]}>
          The original opens in the in-app browser, not a separate hand-off to Safari.
        </Text>
      </View>
      <ScreenDisclaimer />
    </ScrollView>
  );
}

function AudioBlock({ item }: { item: FeedItem }) {
  const theme = useTheme();
  const [audio, setAudio] = useState<ResolvedAudio | null>(null);
  const [state, setState] = useState<'loading' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setAudio(null);
    void resolveAudio(item).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setAudio(result.audio);
        setState('loading');
      } else {
        setState(result.reason);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [attempt, item]);

  if (audio) return <EpisodePlayer audio={audio} />;

  const message =
    state === 'loading'
      ? 'Finding the episode audio…'
      : state === 'error'
        ? 'The episode audio didn’t load.'
        : 'This episode doesn’t include an audio file the app can play. You can still open it below.';

  return (
    <View style={[styles.audioCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.audioKicker, { color: theme.muted }]}>Episode audio</Text>
      <Text style={[styles.audioTitle, { color: theme.text }]}>{item.title}</Text>
      {state === 'loading' ? <ActivityIndicator color={theme.header} /> : null}
      <Text style={[styles.audioBody, { color: theme.muted }]}>{message}</Text>
      {state !== 'loading' ? (
        <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
          <Text style={[styles.retry, { color: theme.link }]}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ArticleText({ url, scale }: { url: string; scale: number }) {
  const theme = useTheme();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void extractArticleText(url).then((next) => {
      if (cancelled) return;
      setText(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return <Text style={[styles.hint, { color: theme.muted }]}>Looking for the article text…</Text>;
  }
  if (!text) return null;
  return (
    <View style={styles.article}>
      <Text style={[styles.audioKicker, { color: theme.muted }]}>From the original page</Text>
      <Text style={[styles.articleBody, { color: theme.text, fontSize: 17 * scale, lineHeight: 26 * scale }]}>
        {text}
      </Text>
    </View>
  );
}

function originalLabel(type: FeedItem['type'], video: boolean): string {
  if (video) return 'Open video page';
  if (type === 'podcast') return 'Open episode page';
  if (type === 'reddit') return 'Open thread';
  return 'Read original';
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  top: { paddingHorizontal: 8, paddingBottom: 8 },
  back: { minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { fontSize: 17, fontWeight: '700' },
  content: { paddingTop: 16, paddingBottom: 8, flexGrow: 1 },
  copy: { paddingHorizontal: 20, gap: 10 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 14, fontWeight: '700' },
  title: { fontFamily: serifFamily },
  summary: {},
  actions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  action: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { fontSize: 16, fontWeight: '800' },
  original: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  originalText: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 13, lineHeight: 18 },
  article: { gap: 8, marginTop: 4 },
  articleBody: {},
  audioCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  audioKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  audioTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  audioBody: { fontSize: 15, lineHeight: 21 },
  retry: { fontSize: 15, fontWeight: '800' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  missing: { fontFamily: serifFamily, fontSize: 24, textAlign: 'center' },
  pressed: { opacity: 0.82 },
});
