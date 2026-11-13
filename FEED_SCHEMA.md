# Feed schema

The app reads a static JSON feed. There is no database and no paid host. An editor (human or the outside curator) publishes two files shapes:

- `feed/index.json` — which days exist
- `feed/days/YYYY-MM-DD.json` — that day’s editions and cards

The phone downloads them, caches them, and searches on the device.

## Where the app looks

`constants/config.ts` has `FEED_BASE_URL`. It is already set:

```text
https://mormonnewsroundup.github.io/mormon-news-roundup/feed
```

The app requests:

```text
{FEED_BASE_URL}/index.json
{FEED_BASE_URL}/days/2026-10-25.json
```

Those URLs are the `feed/` folder in this repository, copied onto GitHub Pages by the **Deploy to GitHub Pages** workflow whenever someone pushes to `main`.

Leave `FEED_BASE_URL` alone when you publish a day. An empty string is only a local escape hatch: the app then ignores the network and reads the sample files bundled into the build.

Pull to refresh on Latest or Search. The app does not need a restart, and it does not need a new App Store build. If the download fails, the phone shows the last copy it saved. If it has never saved one, it shows the bundled sample.

## index.json

```json
{
  "generatedAt": "2026-10-25T16:00:00.000Z",
  "sample": false,
  "days": ["2026-10-25", "2026-10-24", "2026-10-23"],
  "pinned": { "id": "2026-10-25-noon-01", "date": "2026-10-25" }
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `generatedAt` | yes | ISO-8601 date-time. When this index was written. |
| `days` | yes | `YYYY-MM-DD` strings, **newest first**. Each one needs a matching file in `days/`. |
| `sample` | no | `true` only for the bundled placeholder feed. The app shows a “Sample data” banner. Every title and summary must contain the word “Sample”. |
| `pinned` | no | Optional top story. An object `{ "id": "<item id>", "date": "YYYY-MM-DD" }`, or `null` / omitted for no pin. `date` must be a day listed in `days`, and `id` must exist in that day’s file. When set, Latest shows that card first with a small “Pinned” badge, excludes its duplicate, and still fills up to 15 stories. The pin is exempt from the own-channel video slot and the subreddit / Generally Unquotable caps. Old app builds ignore this field; feeds without it keep working. The live index has `"pinned": null`. Midnight and noon runs keep it null unless the owner asks for a pin. |

Dates are calendar dates in `America/New_York`. `2026-10-25` means October 25 in Eastern Time, not UTC.

## Day file

Path: `feed/days/YYYY-MM-DD.json`. The filename, the `date` field, and the index entry must match.

```json
{
  "date": "2026-10-25",
  "sample": false,
  "editions": [
    {
      "name": "midnight",
      "publishedAt": "2026-10-25T04:00:00.000Z",
      "items": []
    },
    {
      "name": "noon",
      "publishedAt": "2026-10-25T16:00:00.000Z",
      "items": []
    }
  ]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `date` | yes | `YYYY-MM-DD`, Eastern Time. |
| `editions` | yes | One or two editions. A day can be midnight only. |
| `sample` | no | Same meaning as on the index. |

### Editions

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | `"midnight"` or `"noon"`. One of each at most. |
| `publishedAt` | yes | ISO-8601. Midnight is 12:00 a.m. Eastern. Noon is 12:00 p.m. Eastern. In October that is `04:00` UTC and `16:00` UTC. In winter (EST) it is `05:00` UTC and `17:00` UTC. |
| `items` | yes | Array of cards. Can be empty, but don’t publish an empty edition if you can avoid it. |

The app shows one list for the day. Noon items come first, then midnight items, each newest first. It ignores the order in the file. It does not show an edition name or a divider.

There is no third edition. A later fix would be a new `name` plus an app update. Don’t invent extra names.

### Items

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `id` | yes | string | Unique across the whole archive. Suggested: `2026-10-25-noon-01`. |
| `type` | yes | string | `article`, `video`, `podcast`, or `reddit`. |
| `title` | yes | string | The headline. |
| `summary` | yes | string | One or two sentences. Shown in full on the card. |
| `source` | yes | string | Publication or show name. Search matches this. For a Reddit post this is often the subreddit, such as `r/exmormon`. |
| `url` | yes | string | Absolute `http` or `https` link opened when the card is tapped. A `reddit` item must be a reddit.com post permalink: host `reddit.com` or a subdomain such as `www`, `old`, or `np`, and a path that contains `/comments/` plus the post id. |
| `thumbnailUrl` | yes, except `reddit` | string | Absolute `https` image URL. The bundled sample uses `sample:article` and similar tokens; don’t use those in a hosted feed. A `reddit` item may omit this field or set it to `""` when the post has no image. If it is set to a non-empty value, that value must still be `https`. A generated Reddit picture is committed at `feed/images/reddit/<item-id>.jpg` and linked as `https://mormonnewsroundup.github.io/mormon-news-roundup/feed/images/reddit/<item-id>.jpg`. The card crops that picture to fill the frame. |
| `publishedAt` | yes | string | ISO-8601. Must fall on the file’s Eastern Time date. Newest items in an edition are shown first. |
| `paywalled` | yes | boolean | `true` draws a lock. The card still opens `url`. It does not mean the app sells the article. |
| `tags` | yes | string[] | For the curator. v1 search does **not** look at tags. Use `[]` if you have none. |
| `subreddit` | no | string | Optional, for `reddit` items. Example: `r/exmormon`. Omit it when you have nothing to store. The card does not print this field by itself; put the name readers should see in `source`. |
| `satire` | no | boolean | Optional internal metadata. Omit it, or set `false`, for an ordinary item. `true` marks an occasional humor piece, such as The Babylon Bee. The app does not display this field. The card still shows the source, the type label (Article, Video, Podcast, or Reddit), and the publish date, with the same badge style as any other item of that type. Search filters on `type`. |
| `audioUrl` | no | string | Optional `https` audio file for a podcast. When it is set, the in-app player uses it and does not look up the show. Omit it for a normal item. The app can still play an Apple Podcasts, Buzzsprout, or RSS episode without this field. |

What a tap does:

- Every card opens a story screen in the app. Save and Share are on that screen.
- `video` on YouTube plays in an embedded player. It does not leave for Safari.
- `podcast` plays in the audio player when the feed has `audioUrl`, the link is an audio file, or the app can resolve an Apple Podcasts, Buzzsprout, or RSS enclosure. Otherwise the episode page opens in the in-app browser.
- `article` shows the summary, and the original page’s text when it can be read. **Read original** uses the in-app browser (Safari view on iPhone).
- `reddit` shows the summary, then the thread in the in-app browser.

A Reddit card’s line under the picture is `source · Reddit · October 26, 2026`. With no picture, the card shows an orange tile with `r/` instead of a broken image. Search filters by type, source, and date.

Share sends the title, the `url`, and the line `via Mormon News Roundup`.

## Example item

```json
{
  "id": "2026-10-25-midnight-02",
  "type": "article",
  "title": "Headline of the real story",
  "summary": "One or two sentences from the curator. This example is only the shape.",
  "source": "Sample Docket",
  "url": "https://example.com/story",
  "thumbnailUrl": "https://example.com/images/story.jpg",
  "publishedAt": "2026-10-25T04:12:00.000Z",
  "paywalled": false,
  "tags": ["lawsuit", "court"]
}
```

That example is the shape, not a story to publish.

A Reddit post uses the same fields. `thumbnailUrl` may be left out. When the post has a generated picture, commit `feed/images/reddit/<item-id>.jpg` next to the day file and set `thumbnailUrl` to the Pages address for that file. `npm run check-feed` confirms the file is in the repo, because that address is not public until the deploy. `subreddit` is optional.

```json
{
  "id": "2026-10-26-noon-03",
  "type": "reddit",
  "title": "Headline of the thread",
  "summary": "One or two sentences from the curator. This example is only the shape.",
  "source": "r/exmormon",
  "url": "https://www.reddit.com/r/exmormon/comments/exampleid/headline_of_the_thread/",
  "subreddit": "r/exmormon",
  "publishedAt": "2026-10-26T16:12:00.000Z",
  "paywalled": false,
  "tags": []
}
```

## Sample thumbnail tokens

Only the bundled preview understands these. A hosted feed should use normal image URLs. If an image fails, the card shows a plain colored block with the type name. A Reddit post with no image shows an orange tile with `r/` instead.

| Token | Picture |
| --- | --- |
| `sample:article` | Article |
| `sample:video` | Video |
| `sample:podcast` | Podcast |
| `sample:court` | Court |
| `sample:announcement` | Announcement |

## Publishing

Publishing is a commit to the `main` branch of this repository. The push runs GitHub Actions, which rebuilds the website and publishes `feed/` at:

```text
https://mormonnewsroundup.github.io/mormon-news-roundup/feed/index.json
https://mormonnewsroundup.github.io/mormon-news-roundup/feed/days/YYYY-MM-DD.json
```

You do not upload a separate host, and you do not edit `constants/config.ts` for a normal edition. The same steps are written for a non-developer in the README section **Publish a day’s feed**.

### Midnight edition (a new day)

1. Add `feed/days/YYYY-MM-DD.json` with a `midnight` edition. `publishedAt` is 12:00 a.m. Eastern on that date.
2. Edit `feed/index.json`: put that date first in `days`, and set `generatedAt` to the time you are publishing. Leave `pinned` null. A midnight run does not set a pin. Add one only when the owner asks for a specific story.
3. Commit both files and push to `main`.

### Noon update (the same day)

1. Edit the same `feed/days/YYYY-MM-DD.json` and add a `noon` edition. Do not add a second file. `publishedAt` is 12:00 p.m. Eastern.
2. Set `generatedAt` in `feed/index.json` to the current time. The date is already in `days`. Leave `pinned` null unless the owner has asked for a pin.
3. Commit and push to `main` again.

Aim for 8–12 items on a full day. The midnight edition is the main one. Noon is a short update. A shorter day is still valid.

The live `feed/` folder is the real edition. `feed/index.json` has `"sample": false` and lists `2026-10-25`, `2026-10-24`, `2026-10-23`, and `2026-10-20`. Latest Headlines shows up to 15 stories by `publishedAt`, across every date, with no age cutoff, and exactly one Mormon News Roundup YouTube video (the newest). It also keeps at most one r/exmormon post, one r/mormon post, and one Generally Unquotable video, each the newest. Older items from those sources stay in Search. When `pinned` is set on the index, that story is shown first (with a “Pinned” badge) and is exempt from those caps; the rest of the list still follows them. The app loads day files from the newest date forward until that list is full and includes that video, when the feed has one, and always loads the pin’s day when a pin is set. Search opens every date in `days`. Set `"sample": false` on the index to keep the Sample data banner off. Real `thumbnailUrl` values are `https` image addresses.

### Pin a top story

To pin one story so it always appears first on Latest:

1. Find the item’s `id` and the Eastern calendar `date` of its day file (for example `2026-10-28-noon-10` in `feed/days/2026-10-28.json`).
2. Edit `feed/index.json` and add (or update):

```json
"pinned": { "id": "2026-10-28-noon-10", "date": "2026-10-28" }
```

3. Set `generatedAt` to the time you are publishing. Commit and push `feed/index.json` only if you are changing the pin (no need to rewrite the day file).
4. To clear the pin, set `"pinned": null` or remove the field, then push.

`npm run check-feed` confirms the pin’s `date` is in `days` and the `id` exists in that day’s file. The outside curator and both daily runs (midnight and noon) keep `pinned` null. Do not copy an old pin object back into a new index. Set a pin only when the owner asks for one.

`fallback/` is the offline sample bundled into the app. GitHub Pages does not publish it. `sample:` thumbnail tokens belong there only.

After the push, wait until the **Deploy to GitHub Pages** action is green, then pull to refresh on the phone. If the action fails, the previous site stays up.

Keep the JSON public. There are no accounts in v1, so there is no private feed. A later custom domain such as `https://mormonnewsroundup.org/feed` would mean changing `FEED_BASE_URL` and shipping an app update. This repository’s Pages URL does not.

## Check the files

From the project folder, someone technical can run:

```bash
npm run check-feed
```

That checks ids, types, dates, edition names, newest-first order, and that each `publishedAt` falls on the file’s Eastern Time date. A real item’s `thumbnailUrl` must be `https`, except a `reddit` item may omit it. A thumbnail on this site’s `feed/images/` path must match a file already in the repo. A `reddit` url must be a reddit.com post permalink. While `index.json` has `"sample": true`, every title and summary must contain “Sample”. If `pinned` is present and not null, its `date` must be in `days` and its `id` must exist in that day’s file.

A short day, a missing podcast, or fewer than two titles that mention lawsuit is a warning, not a failure. The command still exits successfully so that edition can be pushed. A `tiktok` type fails the check.

## Cache

The phone asks the network for the index and each day whenever Latest or Search loads, when you pull to refresh, and when the app or browser tab is shown again. A successful download is saved. Search then filters on the device. A few thousand items is the size this is built for. If the download fails, the saved copy stays on screen. If there is no saved copy, the bundled sample is the last resort.
