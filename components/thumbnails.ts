import type { ImageSourcePropType } from 'react-native';

const SAMPLE_THUMBS: Record<string, ImageSourcePropType> = {
  article: require('../assets/sample/article.png'),
  video: require('../assets/sample/video.png'),
  podcast: require('../assets/sample/podcast.png'),
  tiktok: require('../assets/sample/tiktok.png'),
  court: require('../assets/sample/court.png'),
  announcement: require('../assets/sample/announcement.png'),
};

export function thumbnailSource(url: string): ImageSourcePropType | null {
  if (url.startsWith('sample:')) {
    return SAMPLE_THUMBS[url.slice('sample:'.length)] ?? null;
  }
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return { uri: url };
  }
  return null;
}
