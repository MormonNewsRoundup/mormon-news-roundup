import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform, Share } from 'react-native';

import { tell } from '@/lib/notice';
import type { FeedItem } from '@/lib/types';

function shareMessage(item: FeedItem): string {
  return `${item.title}\n${item.url}\n\nvia Mormon News Roundup`;
}

export async function shareItem(item: FeedItem): Promise<void> {
  const message = shareMessage(item);
  try {
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
      };
      if (typeof nav.share === 'function') {
        await nav.share({
          title: item.title,
          text: `${item.title}\n\nvia Mormon News Roundup`,
          url: item.url,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        tell('Link copied', 'It includes the original URL and “via Mormon News Roundup”.');
        return;
      }
    }

    await Share.share({
      message,
      url: item.url,
      title: item.title,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError') return;
    tell('Could not share', 'Try again in a moment.');
  }
}

/** SFSafariViewController on iPhone, so the original page stays inside the app. */
export async function openInAppBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      controlsColor: '#1D1838',
    });
  } catch {
    try {
      await Linking.openURL(url);
    } catch {
      tell('Could not open this link', url);
    }
  }
}

export async function openItem(item: FeedItem): Promise<void> {
  await openInAppBrowser(item.url);
}

export async function openExternal(url: string): Promise<void> {
  await openInAppBrowser(url);
}
