import { Platform } from 'react-native';

export const serifFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export type Palette = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  header: string;
  headerText: string;
  gold: string;
  tabBar: string;
  tabIcon: string;
  tabActive: string;
  chip: string;
  chipActive: string;
  chipText: string;
  chipActiveText: string;
  ad: string;
  adText: string;
  frame: string;
  link: string;
  shadow: string;
};

/**
 * Header indigo and gold underline match the custom CSS on
 * mormonnewsroundup.org (#1d1838, #f5e6b3). The page is a warm cream.
 */
export const lightPalette: Palette = {
  background: '#F6F1E7',
  card: '#FFFCF7',
  text: '#1D1838',
  muted: '#5E5878',
  border: '#E4DCCB',
  header: '#1D1838',
  headerText: '#FFFFFF',
  gold: '#F5E6B3',
  tabBar: '#FFFCF7',
  tabIcon: '#8A849C',
  tabActive: '#1D1838',
  chip: '#EFE8DA',
  chipActive: '#1D1838',
  chipText: '#1D1838',
  chipActiveText: '#F5E6B3',
  ad: '#E7E0D2',
  adText: '#5E5878',
  frame: '#1D1838',
  link: '#3F2D86',
  shadow: '#1D1838',
};

export const darkPalette: Palette = {
  background: '#100E1C',
  card: '#1C1830',
  text: '#F6F1E7',
  muted: '#C3B8D4',
  border: '#2E2844',
  header: '#0C0A16',
  headerText: '#FFFFFF',
  gold: '#F5E6B3',
  tabBar: '#161222',
  tabIcon: '#A397B8',
  tabActive: '#F5E6B3',
  chip: '#2A2440',
  chipActive: '#F5E6B3',
  chipText: '#F6F1E7',
  chipActiveText: '#1D1838',
  ad: '#2A2440',
  adText: '#C3B8D4',
  frame: '#000000',
  link: '#F5E6B3',
  shadow: '#000000',
};

export const badgeColors: Record<string, { background: string; text: string }> = {
  article: { background: '#1D1838', text: '#F5E6B3' },
  video: { background: '#8C2F39', text: '#FFFFFF' },
  podcast: { background: '#3F2D86', text: '#FFFFFF' },
  reddit: { background: '#FFFFFF', text: '#FF4500' },
};
