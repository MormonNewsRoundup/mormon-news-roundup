/**
 * App-wide settings the owner or curator may need to change.
 * Everything else in the app reads from here.
 */

/**
 * GitHub Pages project site for this repo. The path must match
 * `experiments.baseUrl` in app.json so the published website loads its
 * scripts. Local `npm run web` does not use this path.
 */
export const WEB_BASE_PATH = '/mormon-news-roundup';

/**
 * Where the live feed is hosted, with no trailing slash.
 *
 * The native app and the website both request:
 *   {FEED_BASE_URL}/index.json
 *   {FEED_BASE_URL}/days/YYYY-MM-DD.json
 *
 * Publishing a day does not change this string. Commit the JSON under feed/
 * and push to main. GitHub Actions copies that folder to this address.
 *
 * An empty string is only a local escape hatch: the app then reads the copy
 * of feed/ bundled into the build and never tries the network.
 */
export const FEED_BASE_URL = 'https://mormonnewsroundup.github.io/mormon-news-roundup/feed';

/**
 * Verified from the YouTube link published on https://mormonnewsroundup.org
 * (the site's own social profile URL). Not a guess.
 */
export const YOUTUBE_CHANNEL_URL = 'https://www.youtube.com/@MormonNewsRoundup';

/** Also linked from mormonnewsroundup.org. */
export const PATREON_URL = 'https://www.patreon.com/MormonNewsRoundup';

export const WEBSITE_URL = 'https://mormonnewsroundup.org';

/** The public news page on the show's website. */
export const BREAKING_NEWS_URL = 'https://mormonnewsroundup.org/breaking-news';

/**
 * Non-consumable App Store / Play product. Create this exact id in
 * App Store Connect for $0.99 before a production build can sell it.
 */
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads';

export const REMOVE_ADS_PRICE_LABEL = '$0.99';

export const APP_PITCH = 'Your Daily Mormon News: Unfiltered';

/** Opening paragraph on About. Shown as written, with no extra label. */
export const ABOUT_INTRO =
  'Mormon News Roundup is the premier app for a daily, unfiltered look at Mormon news: the headlines, investigations, lawsuits, videos, and podcasts about The Church of Jesus Christ of Latter-day Saints, all in one place.';

export const DISCLAIMER =
  'Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.';

/**
 * Google's public sample AdMob app ids (the ones with ~).
 * Replace both before you ship real ads. An ad unit id uses / and is not
 * the same thing. Banner unit ids live in components/NativeAdBanner.tsx
 * via the library's TestIds.BANNER until you swap in your own.
 */
export const ADMOB_TEST_APP_IDS = {
  ios: 'ca-app-pub-3940256099942544~1458002511',
  android: 'ca-app-pub-3940256099942544~3347511713',
} as const;

export function feedBaseUrl(): string {
  return FEED_BASE_URL.trim().replace(/\/+$/, '');
}

export function isBundledFeed(): boolean {
  return feedBaseUrl().length === 0;
}
