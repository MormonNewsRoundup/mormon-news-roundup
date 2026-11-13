# Mormon News Roundup

Your Daily Mormon News: Unfiltered

This is the iPhone app: a daily feed of articles, YouTube videos, podcasts, and Reddit posts, with saved stories, in-app playback, search, and edition alerts. It is meant for hard news about The Church of Jesus Christ of Latter-day Saints (lawsuits, courts, excommunications, scandals) plus major official announcements. Tapping a card opens the story in the app. There are no comments and no accounts.

The app is not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.

The website is already published. Open it in Safari on an iPhone:

https://mormonnewsroundup.github.io/mormon-news-roundup/

Tap the Share button, then **Add to Home Screen**, if you want an icon. Expo Go and a future App Store build read the daily feed from that same site (`/feed` on the address above).

You can also preview the project itself with the free Expo Go app. You do not need a Mac, and you do not need a paid Apple Developer account until you are ready for the App Store.

## Preview it on your iPhone

You need an iPhone and any computer (Windows, Mac, or Linux) on the same Wi-Fi. The computer runs the preview. The phone just displays it.

### 1. Install Expo Go

On the iPhone, open the App Store and install **Expo Go** (the app from Expo). Open it once so iOS finishes installing it.

This project uses **Expo SDK 58**, which matches the current Expo Go on the App Store. If the phone later says the project is incompatible, update Expo Go from the App Store and try again.

### 2. Install Node.js on the computer

Go to [https://nodejs.org](https://nodejs.org) and install the version marked LTS (Node 22 or newer). This gives you the `npm` command used below.

### 3. Get this project onto the computer

Download or copy the project folder. You only need the folder that contains this README and `package.json`.

### 4. Start the preview

Open a terminal in that folder.

- **Mac:** open the Terminal app, type `cd ` (with a space), drag the project folder onto the window, and press Return.
- **Windows:** open the project folder in File Explorer, click the address bar, type `cmd`, and press Enter.

Then run these two commands, one at a time. The first one only has to be done once. It downloads the app’s pieces and can take a few minutes.

```bash
npm install
npm start
```

`npm start` opens the preview in Expo Go. Leave the terminal window open. A QR code appears in it.

If you run `npx expo start` yourself, add `--go` (`npx expo start --go`). Without that flag the QR code is for a custom development build, which Expo Go cannot open.

### 5. Open it on the iPhone

1. Make sure the phone and the computer are on the **same Wi-Fi**. Cellular data alone will not see the computer.
2. Open the iPhone **Camera** app and point it at the QR code.
3. Tap the banner that appears, and choose **Expo Go**.

Latest Headlines shows up to 15 stories, newest first, and exactly one Mormon News Roundup YouTube video: the newest one. Anything after those 15 is in Search.

If the QR code never connects, stop the terminal with Ctrl+C and run:

```bash
npx expo start --go --tunnel
```

Tunnel works across different networks. The first time, it may ask to install a helper. Say yes.

If the terminal asks you to log in to Expo, you can skip it for this preview. A free account at [https://expo.dev](https://expo.dev) is only required later, when you build for the App Store.

To stop the preview, click the terminal and press Ctrl+C. The copy already open on the phone will close when the server stops. Nothing is installed permanently by Expo Go.

## If you cannot install Node

Expo Go on the iPhone still has to load the app from somewhere. There is no permanent Expo Go link in this project, because a lasting one needs an Expo account.

What is possible:

- **A temporary link, no account.** On a computer that already has this folder, a helper runs `npx expo start --go --tunnel ngrok`. That prints an `exp://….exp.direct` address. In Expo Go, tap **Enter URL** and paste it. It works only while that computer stays on. The default `npx expo start --tunnel` (without `ngrok`) asks you to log in to Expo. The `ngrok` tunnel does not.
- **A lasting Expo Go link.** This needs a free account at [https://expo.dev](https://expo.dev), then `npx eas-cli@latest update`. That was not created here.
- **The lasting website.** It is already on GitHub Pages at the link above. You do not host a `dist` folder yourself. A push to the `main` branch rebuilds it.

## What you should see

Five tabs at the bottom:

- **Latest** — up to 15 stories across every day in the feed, newest first. The header says Latest Headlines. There is no age cutoff. Exactly one video from the Mormon News Roundup YouTube channel is included, and it is the newest one. At most one r/exmormon post, one r/mormon post, and one Generally Unquotable video are included, each the newest. Older items from those sources are left out of these 15 and stay in Search. When `feed/index.json` sets `pinned`, that story stays first, shows a Pinned badge, and is exempt from those caps. When a newer story arrives, the oldest of those 15 drops off the bottom and stays in Search. If the feed has fewer than 15 stories, they all stay on Latest. A repeated story is shown once. There is no edition label and no clock time. Each card shows the source, the type, and the full publish date, such as October 23, 2026. That date is the Eastern calendar day of the story, with no clock time and no time zone. Pull down to refresh. Tap a card to open it in the app. **Save** keeps it on the phone. **Share** opens the phone’s share sheet with the link and the words “via Mormon News Roundup”. A small lock means the original link may be paywalled. A labeled ad card is inserted after every fifth story. A small banner sits at the bottom of the screen, with **Remove Ads - $0.99** just above it. Buying or restoring Remove Ads hides both. At the bottom of the list, in small gray type: “Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.”
- **Saved** — stories you saved, newest save first. They stay on the phone and open with no connection. Removing the save takes the story off this list.
- **Search** — continues after Latest. With no text and the default filters, it shows stories 16 through 65, newest first, using the same order as Latest so those 15 are not repeated. If the archive has 15 or fewer stories, a small gray note says “Older stories will appear here.” Type a word, or change the type, source, or time filter, and Search looks through the whole archive, including the stories on Latest. Type chips: All, Articles, Videos, Podcasts, Reddit. Source chips list every show and publication, plus All shows. Time chips: Any time, Past week, Past month, Past year, and Custom range (a from date and a to date). The filters combine. Try `lawsuit` or `podcast`. The same affiliation line is at the bottom. The same small bottom banner is here until ads are removed.
- **Settings** — **Remove Ads - $0.99** and **Restore Purchases** are the first things on the screen. They stay visible if the App Store price is slow or missing. Edition alerts are opt-in. Text size is Small, Default, or Large. Privacy Policy and App Support stay on About.
- **About** — what the app is, the same purchase buttons, YouTube, the website, **Read on the web**, **Privacy Policy**, **App Support**, and a quiet Patreon link. The same affiliation line is at the bottom, not in a box in the middle. The same small bottom banner is here until ads are removed.

## What is live now

The website serves only the files in `feed/`. The archive days are October 25, 24, 23, and 20, 2026, with `"sample": false`. That archive has fewer than 15 stories, so Latest shows all of them, including October 20. There is no Sample data banner while the index says `"sample": false`.

Placeholder cards still exist, but only inside the app, in `fallback/`. They are used when the phone has never downloaded the feed and cannot reach the site. They are not copied to GitHub Pages. Do not edit `fallback/` to publish a day.

## Publish a day’s feed

The phone app and the website both read one public folder:

https://mormonnewsroundup.github.io/mormon-news-roundup/feed

That folder is the `feed/` directory in this repository. `constants/config.ts` already points at it. **Do not edit that address to publish an edition.** Add or edit JSON files, commit them, and push to the `main` branch. That push is the publish button. GitHub Actions rebuilds the website, copies `feed/` onto it, and the new files are public. Pull down on Latest in the app to refresh. You do not ship a new app build.

Editions go out twice a day, on Eastern Time: midnight, then a noon update. The field rules are in `FEED_SCHEMA.md`.

### Midnight edition (a new day)

1. Add a file named `feed/days/YYYY-MM-DD.json`. Example: `feed/days/2026-10-26.json`. It needs one edition named `midnight`. The edition’s `publishedAt` is 12:00 a.m. Eastern on that date.
2. Edit `feed/index.json`:
   - Put that date **first** in the `days` list.
   - Set `generatedAt` to the current time, written like `2026-10-26T04:00:00.000Z`.
   - Leave `pinned` null. A midnight run does not set a pin. Add one only when the owner asks for a specific story.
3. Commit both files on the `main` branch and push.
   - On the GitHub website: upload or edit the files, then **Commit changes** directly to `main`.
   - On a computer: commit, then `git push` to `main`.

### Noon update (the same day)

1. Edit the same file, `feed/days/YYYY-MM-DD.json`. Add a second edition named `noon`. Do not create a second file. The noon `publishedAt` is 12:00 p.m. Eastern.
2. Edit `feed/index.json` and set `generatedAt` to the current time. Leave `days` as it is. The date is already listed. Leave `pinned` null unless the owner has asked for a pin.
3. Commit and push to `main` again.

Wait until the **Deploy to GitHub Pages** action on the repository is green (usually a few minutes). Then open:

https://mormonnewsroundup.github.io/mormon-news-roundup/feed/index.json

The new date should be first. If that action fails, the previous site stays up. Fix the JSON and push again.

### Real cards and the Sample banner

The app shows a **Sample data** banner only while `feed/index.json` says `"sample": true`. The live index is `"sample": false`, so the banner stays off.

If you ever publish a placeholder day again:

- Put the word Sample in every title and summary.
- Set `"sample": true` on that day file and on `feed/index.json`.

Real cards need an `https` picture address in `thumbnailUrl`. A Reddit post may leave that field out when it has no image. A generated Reddit picture belongs at `feed/images/reddit/<item-id>.jpg`, and `thumbnailUrl` is that file’s Pages address. Tokens such as `sample:article` belong only in `fallback/`. A day can have fewer than 8 items, and it does not need a podcast or the word lawsuit. `npm run check-feed` mentions those as warnings and still succeeds. The type has to be an article, a video, a podcast, or a Reddit post.

The phone saves the last feed it downloaded. If the site cannot be reached, it shows that saved copy. If it has never downloaded one, it shows the sample files built into the app.

Someone helping you can check the files before the push:

```bash
npm run check-feed
```

## Ads and the $0.99 purchase

Version 1.0.1 ships with both **on**. `ADS_ENABLED` and `IAP_ENABLED` in `constants/config.ts` are `true`. The owner approved this for the first update after the 1.0 App Store release.

What the app shows:

- A native ad card in Latest after every fifth story, labeled **Ad**, using the same card shape as a story. There is no extra ad after the first story.
- A small 320×50 banner at the bottom of Latest, Search, and About.
- No full-screen ads.

Buying or restoring **Remove Ads** hides the cards and the banner. The product id is exactly `remove_ads`, a one-time non-consumable at $0.99. The buttons are on the Settings tab, at the top of About, and above the bottom banner. They stay on screen if the App Store product query fails. There is no login and no receipt server. StoreKit loads only outside Expo Go.

Version 1.0.2 adds saved stories, an in-app YouTube player, a podcast audio player, source filters, and opt-in edition alerts. Alerts are local: the phone checks the public feed when you open the app, and iOS may also run that check in the background. There is no push server, so an alert is not guaranteed at the minute an edition is published.

`react-native-google-mobile-ads` and `expo-iap` are installed. `expo-dev-client` is not. The production EAS profile builds a normal release app. Development (`__DEV__`) requests Google’s test ad units. A release build, including TestFlight, requests the live Feed Native and Bottom Banner units. The AdMob app id in the Expo config plugin is `ca-app-pub-9312708404620157~6988724299`, so `GADApplicationIdentifier` is not a Google sample id. The same id is also set as the Android app id because this release is iPhone-only and no separate Android AdMob app was provided.

The app asks for App Tracking Transparency before starting the ads SDK. Until that permission is allowed, requests are non-personalized. `NSUserTrackingUsageDescription` explains that the identifier is used to show more relevant ads that support the show, and that ads can be removed with a one-time purchase. The ads config plugin writes AdMob’s SKAdNetwork identifier list into Info.plist. It is the full published list, not a single id.

Expo Go and the website show labeled stand-ins. They do not load the native ad SDK.

Before the next App Review submission, update the App Store privacy answers. This version is no longer “Data Not Collected”. Expect advertising data, identifiers (Device ID), and tracking, because the app requests tracking permission. Do that in App Store Connect. The product `remove_ads` still needs a review screenshot there before it can leave Missing Metadata.

## Path to the App Store

You still do not need a Mac. EAS Build compiles the iOS app on Expo’s servers. You **do** need a paid Apple Developer account for this part. Previewing in Expo Go stays free.

Version 1.0 is already on the App Store. For 1.0.1, update the privacy label, add the Remove Ads review screenshot, then build and send the binary to TestFlight. Do not submit 1.0.1 to App Review until that store setup is done. The original setup steps are below.

1. **Apple Developer Program** — $99 per year at [https://developer.apple.com](https://developer.apple.com). Enroll as an individual or an organization. Approval can take a day or two.
2. **Expo account** — free at [https://expo.dev](https://expo.dev). In the project folder:

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init
   ```

   `init` links this folder to Expo and writes a project id into `app.json`. Commit that change.

3. **App Store Connect** — [https://appstoreconnect.apple.com](https://appstoreconnect.apple.com). Create an app named **Mormon News Roundup**. The bundle id is `com.mormonnewsroundup.app` (set in `app.json`). Change that id before the first upload if you want a different one. After the first upload it is painful to change.
4. **Age rating 17+.** The questionnaire should reflect lawsuits and sexual abuse coverage. Say that plainly in the listing.
5. **Privacy policy and support URLs.** Apple requires both in the App Store Connect listing. They are live: `https://mormonnewsroundup.org/privacy` and `https://mormonnewsroundup.org/app-support`. The same addresses are in `app.json` under `expo.extra` and on the About screen.
6. **Privacy answers.** 1.0 was **Data Not Collected**. 1.0.1 uses ads and App Tracking Transparency, so update the privacy label before submitting this build: advertising data, identifiers (Device ID), and tracking. The privacy policy URL stays `https://mormonnewsroundup.org/privacy`.
7. **AdMob and the $0.99 purchase** are in this build. See **Ads and the $0.99 purchase** above. The non-consumable `remove_ads` already exists in App Store Connect. Upload a review screenshot for it before App Review, or the product stays in Missing Metadata.
8. **iPhone only.** `ios.supportsTablet` is false so Apple does not ask for iPad screenshots. Local `ios.buildNumber` is `"5"` for version 1.0.1, the build after the live build 4. `eas.json` uses `appVersionSource: "remote"` and production `autoIncrement`, so EAS may set the uploaded build number itself.
9. **Build in the cloud** (no Mac):

   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

   `eas.json` also has a `development` profile and a `preview` profile. Both are internal installs of a normal release app. `expo-dev-client` is not installed, so production is not a dev client. Expo Go does not build the store app.

10. **Upload to App Store Connect:**

    ```bash
    npx eas-cli@latest submit --platform ios --profile production
    ```

11. **TestFlight.** Install Apple’s TestFlight app. Add yourself as a tester. Try search, a card, share, a feed ad, the bottom banner, and Remove ads. Do not submit this build to App Review from here.
12. **Submit for review** from App Store Connect once the listing, screenshots, privacy policy, support URL, age rating, and ads/purchase setup are in place.

`eas.json` is already set for those three build types. You do not need to create an `ios` folder. EAS creates the native project on their servers from `app.json`.

## Still to do

- `FEED_BASE_URL` in `constants/config.ts` is the GitHub Pages feed. A new day is a JSON commit to `main`, not a change to that file.
- Ads and the $0.99 Remove Ads purchase are on for 1.0.1. See **Ads and the $0.99 purchase**. There is still no receipt server.
- Privacy policy: `https://mormonnewsroundup.org/privacy`. Support: `https://mormonnewsroundup.org/app-support`. The App Store privacy label must be updated before the next review.
- The Expo project id is already in `app.json`.
- The YouTube link is the one published on mormonnewsroundup.org: `https://www.youtube.com/@MormonNewsRoundup`. Patreon is `https://www.patreon.com/MormonNewsRoundup`.

## For a helper

```bash
npm install
npm start          # Expo Go
npm run web        # browser preview
npm run typecheck  # TypeScript
npm run check-feed # live JSON; short days warn, they do not fail
```

The store build does not include the Expo dev client. `npm start` still opens Expo Go for day-to-day preview. A dev-client binary needs `expo-dev-client` installed again, the plugin added back to `app.json`, and `developmentClient: true` on the development profile in `eas.json`.

Useful files:

| File | What it is |
| --- | --- |
| `app/(tabs)/index.tsx` | Latest Headlines |
| `app/(tabs)/search.tsx` | Search |
| `app/(tabs)/about.tsx` | About, purchase, preview switch |
| `constants/config.ts` | Feed URL, product id, public links |
| `lib/feed.ts` | Download and cache |
| `lib/purchases.ts` | StoreKit, loaded only outside Expo Go |
| `components/AdBanner.tsx` | In-feed native ad card, or a labeled stand-in in Expo Go |
| `components/BottomAdSlot.tsx` | Small bottom banner, hidden after Remove Ads |
| `lib/mobileAds.ts` | One-time ads SDK start, test units in dev, live units in release |
| `feed/` | The live feed. Pushing changes here to `main` publishes them |
| `fallback/` | Offline sample inside the app. Not published to the website |
| `dist/` | Built by GitHub Actions. Not stored in the repo. Locally: `npm run export:web` |
| `eas.json` | development, preview, and production builds |
| `FEED_SCHEMA.md` | Rules for the curator’s JSON |
