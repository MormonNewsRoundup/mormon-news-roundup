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

/** App Store privacy policy and support pages. Also listed in app.json extra. */
export const PRIVACY_POLICY_URL = 'https://mormonnewsroundup.org/privacy';
export const APP_SUPPORT_URL = 'https://mormonnewsroundup.org/app-support';

/**
 * Non-consumable App Store product. This id already exists in App Store
 * Connect as a $0.99 Remove Ads purchase. There is no login and no receipt server.
 */
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads';

export const REMOVE_ADS_PRICE_LABEL = '$0.99';

/**
 * 1.0.1 ships ads and the one-time Remove Ads purchase. The owner approved both.
 * AdMob app id, tracking text, and SKAdNetwork ids are in the
 * react-native-google-mobile-ads plugin in app.json. Development builds
 * request Google's test ad units; release builds use the live units.
 */
export const ADS_ENABLED = true;
export const IAP_ENABLED = true;

export const APP_PITCH = 'Your Daily Mormon News: Unfiltered';

/** Opening paragraph on About. Shown as written, with no extra label. */
export const ABOUT_INTRO =
  'Mormon News Roundup is the premier app for a daily, unfiltered look at Mormon news: the headlines, investigations, lawsuits, videos, and podcasts about The Church of Jesus Christ of Latter-day Saints, all in one place.';

export const DISCLAIMER =
  'Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.';

export function feedBaseUrl(): string {
  return FEED_BASE_URL.trim().replace(/\/+$/, '');
}

export function isBundledFeed(): boolean {
  return feedBaseUrl().length === 0;
}
