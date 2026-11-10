import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

/** Embedded YouTube player. Playback stays in the app. */
export function YouTubeEmbed({ videoId }: { videoId: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0&modestbranding=1`;
  return (
    <View style={styles.frame}>
      <WebView
        source={{ uri: src }}
        style={styles.web}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    marginHorizontal: 16,
    marginBottom: 16,
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  web: { flex: 1, backgroundColor: '#000' },
});
