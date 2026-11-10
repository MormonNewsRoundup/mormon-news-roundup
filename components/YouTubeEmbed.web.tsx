import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

/** Embedded YouTube player for the web preview. */
export function YouTubeEmbed({ videoId }: { videoId: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0&modestbranding=1`;
  return (
    <View style={styles.frame}>
      {createElement('iframe', {
        src,
        title: 'Video',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
        allowFullScreen: true,
        style: { width: '100%', height: '100%', border: 0, backgroundColor: '#000' },
      })}
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
});
