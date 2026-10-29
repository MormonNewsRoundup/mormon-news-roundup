# Mormon News Roundup

Your Daily Mormon News: Unfiltered

This is version 1 of the iPhone app: a daily feed of articles, YouTube videos, podcasts, and Reddit posts. It is meant for hard news about The Church of Jesus Christ of Latter-day Saints (lawsuits, courts, excommunications, scandals) plus major official announcements. Tapping a card opens the original link. There are no comments, no accounts, and no notifications in this version.

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

The first screen is a short welcome with the disclaimer. Tap **Continue**. Latest Headlines shows up to 15 stories, newest first, and exactly one Mormon News Roundup YouTube video: the newest one. Anything after those 15 is in Search.

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

Three tabs at the bottom:

- **Latest** — up to 15 stories across every day in the feed, newest first. The header says Latest Headlines. There is no age cutoff. Exactly one video from the Mormon News Roundup YouTube channel is included, and it is the newest one. At most one r/exmormon post, one r/mormon post, and one Generally Unquotable video are included, each the newest. Older items from those sources are left out of these 15 and stay in Search. When a newer story arrives, the oldest of those 15 drops off the bottom and stays in Search. If the feed has fewer than 15 stories, they all stay on Latest. A repeated story is shown once. There is no edition label and no clock time. Each card shows the source, the type, and the full publish date, such as October 23, 2026. That date is the Eastern calendar day of the story, with no clock time and no time zone. Pull down to refresh. Tap a card to open its link. **Share** opens the phone’s share sheet with the link and the words “via Mormon News Roundup”. A small lock means the original link may be paywalled. v1 has no ad boxes between cards. At the bottom of the list, in small gray type: “Not affiliated with or endorsed by The Church of Jesus Christ of Latter-day Saints.”
- **Search** — continues after Latest. With no text and the default filters, it shows stories 16 through 65, newest first, using the same order as Latest so those 15 are not repeated. If the archive has 15 or fewer stories, a small gray note says “Older stories will appear here.” Type a word, or change the type or time filter, and Search looks through the whole archive, including the stories on Latest. Type chips: All, Articles, Videos, Podcasts, Reddit. Time chips: Any time, Past week, Past month, Past year, and Custom range (a from date and a to date). The two sets combine. Try `lawsuit` or `podcast`. The same affiliation line is at the bottom.
- **About** — what the app is, YouTube, the website, **Read on the web**, **Privacy Policy**, **App Support**, and a quiet Patreon link. The same affiliation line is at the bottom, not in a box in the middle. Remove ads and Restore purchase stay hidden while `IAP_ENABLED` is false.

The v1 App Store app does not show ad boxes. `ADS_ENABLED` in `constants/config.ts` is false, so Latest does not insert ad slots.

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
3. Commit both files on the `main` branch and push.
   - On the GitHub website: upload or edit the files, then **Commit changes** directly to `main`.
   - On a computer: commit, then `git push` to `main`.

### Noon update (the same day)

1. Edit the same file, `feed/days/YYYY-MM-DD.json`. Add a second edition named `noon`. Do not create a second file. The noon `publishedAt` is 12:00 p.m. Eastern.
2. Edit `feed/index.json` and set `generatedAt` to the current time. Leave `days` as it is. The date is already listed.
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

v1 ships with both **off**. `ADS_ENABLED` and `IAP_ENABLED` in `constants/config.ts` are `false`. Latest has no ad slots, About has no Remove ads or Restore purchase rows, and nothing shows a “Loading test ad…” line. The App Store privacy answers for this version are **Data Not Collected**. Do not turn either switch on without the owner’s approval.

`react-native-google-mobile-ads`, `expo-iap`, and `expo-dev-client` are not installed. `app.json` has no AdMob plugin, no StoreKit plugin, and no tracking-permission text. The production EAS profile builds a normal release app.

### Turning ads and the remove-ads purchase back on

1. Get the owner’s approval.
2. Set `ADS_ENABLED` and `IAP_ENABLED` to `true` in `constants/config.ts`.
3. Install the packages again: `npx expo install react-native-google-mobile-ads expo-iap`.
4. Put the AdMob and `expo-iap` config plugins back in `app.json`, including `NSUserTrackingUsageDescription` only if ads will use the advertising identifier. The old plugin block is in git history.
5. Restore `components/NativeAdBanner.tsx` and the StoreKit flow in `lib/purchases.ts` from git history (the commit before v1 removed them). `AdBanner` already skips its work while `ADS_ENABLED` is false.
6. Create the AdMob app and banner unit, and the non-consumable App Store product `remove_ads` at $0.99. Replace Google’s test ids before anyone sees real ads.
7. Update the App Store privacy answers. Ads mean the listing is no longer “Data Not Collected”.

The product id, when you create it, is exactly `remove_ads`. There is no login. v1 does not send receipts to a server.

## Path to the App Store

You still do not need a Mac. EAS Build compiles the iOS app on Expo’s servers. You **do** need a paid Apple Developer account for this part. Previewing in Expo Go stays free.

Do these in order when you are ready. None of them are done yet.

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
6. **Privacy answers.** v1 is **Data Not Collected**. The app has no accounts, no advertising identifier, and no tracking prompt. When ads are approved later, update these answers before shipping that build.
7. **AdMob and the $0.99 purchase** come later, and only with the owner’s approval. The steps are under **Turning ads and the remove-ads purchase back on** above. Do not add them to this first binary.
8. **iPhone only.** `ios.supportsTablet` is false so Apple does not ask for iPad screenshots. `ios.buildNumber` starts at `"1"`. `eas.json` uses `appVersionSource: "remote"` and production `autoIncrement`.
9. **Build in the cloud** (no Mac):

   ```bash
   npx eas-cli@latest build --platform ios --profile production
   ```

   `eas.json` also has a `development` profile and a `preview` profile. Both are internal installs of a normal release app. `expo-dev-client` is not installed, so production is not a dev client. Expo Go does not build the store app.

10. **Upload to App Store Connect:**

    ```bash
    npx eas-cli@latest submit --platform ios --profile production
    ```

11. **TestFlight.** Install Apple’s TestFlight app. Add yourself as a tester. Try search, a card, and share. This build has no ad and no purchase.
12. **Submit for review** from App Store Connect once the listing, screenshots, privacy policy, support URL, age rating, and ads/purchase setup are in place.

`eas.json` is already set for those three build types. You do not need to create an `ios` folder. EAS creates the native project on their servers from `app.json`.

## Still to do

- `FEED_BASE_URL` in `constants/config.ts` is the GitHub Pages feed. A new day is a JSON commit to `main`, not a change to that file. The live edition is the real October 23 set.
- Ads and the $0.99 purchase are off for v1. See **Turning ads and the remove-ads purchase back on**. Do not add the AdMob or StoreKit packages until the owner says so.
- Privacy policy: `https://mormonnewsroundup.org/privacy`. Support: `https://mormonnewsroundup.org/app-support`. Paste both into the App Store Connect listing.
- The Expo project is not linked yet. `npx eas-cli@latest init` does that.
- There is no StoreKit purchase in v1, and no receipt server.
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
| `components/WelcomeScreen.tsx` | First-launch disclaimer |
| `constants/config.ts` | Feed URL, product id, public links |
| `lib/feed.ts` | Download and cache |
| `lib/purchases.ts` | StoreKit, loaded only outside Expo Go |
| `components/AdBanner.tsx` | Ad box, or the real banner outside Expo Go |
| `feed/` | The live feed. Pushing changes here to `main` publishes them |
| `fallback/` | Offline sample inside the app. Not published to the website |
| `dist/` | Built by GitHub Actions. Not stored in the repo. Locally: `npm run export:web` |
| `eas.json` | development, preview, and production builds |
| `FEED_SCHEMA.md` | Rules for the curator’s JSON |
