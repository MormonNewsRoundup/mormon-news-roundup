import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useTheme } from '@/components/useTheme';
import type { ResolvedAudio } from '@/lib/playback';

let audioMode: Promise<void> | null = null;

function ensureAudioMode(): Promise<void> {
  if (!audioMode) {
    audioMode = setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).then(() => undefined);
  }
  return audioMode;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}

/** Native episode player. Background audio and lock-screen controls when the OS allows them. */
export function EpisodePlayer({ audio }: { audio: ResolvedAudio }) {
  const theme = useTheme();
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [barWidth, setBarWidth] = useState(1);

  useEffect(() => {
    void ensureAudioMode();
  }, []);

  useEffect(() => {
    player.replace({ uri: audio.url });
  }, [audio.url, player]);

  useEffect(() => {
    return () => {
      player.clearLockScreenControls();
    };
  }, [player]);

  function toggle() {
    void ensureAudioMode().then(() => {
      player.setActiveForLockScreen(true, {
        title: audio.title,
        artist: audio.artist,
        artworkUrl: audio.artworkUrl,
      });
      if (status.playing) player.pause();
      else player.play();
    });
  }

  function seek(event: GestureResponderEvent) {
    if (!status.duration) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / barWidth));
    void player.seekTo(ratio * status.duration);
  }

  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const label = status.playing ? 'Pause' : 'Play';

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.kicker, { color: theme.muted }]}>Episode audio</Text>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {audio.title}
      </Text>
      <Text style={[styles.artist, { color: theme.muted }]}>{audio.artist}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={toggle}
        style={({ pressed }) => [styles.play, { backgroundColor: theme.header }, pressed && styles.pressed]}>
        <Text style={[styles.playText, { color: theme.gold }]}>{status.isBuffering && !status.playing ? 'Loading…' : label}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="Playback position"
        onPress={seek}
        onLayout={(event) => setBarWidth(Math.max(1, event.nativeEvent.layout.width))}
        style={styles.barHit}>
        <View style={[styles.bar, { backgroundColor: theme.chip }]}>
          <View style={[styles.fill, { backgroundColor: theme.header, width: `${progress * 100}%` }]} />
        </View>
      </Pressable>
      <Text style={[styles.time, { color: theme.muted }]}>
        {clock(status.currentTime)} / {status.duration ? clock(status.duration) : '—'}
      </Text>
      <Text style={[styles.note, { color: theme.muted }]}>
        Playback continues with the screen locked. Lock screen and Control Center controls show while it plays.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  artist: { fontSize: 14, fontWeight: '600' },
  play: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  playText: { fontSize: 18, fontWeight: '800' },
  barHit: { paddingVertical: 8 },
  bar: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%' },
  time: { fontSize: 13, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 18 },
  pressed: { opacity: 0.82 },
});
