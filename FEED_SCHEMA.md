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

Pull to refresh on Today or Search. The app does not need a restart, and it does not need a new App Store build. If the download fails, the phone shows the last copy it saved. If it has never saved one, it shows the bundled sample.

## index.json

```json
{
  "generatedAt": "2026-10-25T16:00:00.000Z",
  "sample": false,
  "days": ["2026-10-25", "2026-10-24", "2026-10-23"]
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `generatedAt` | yes | ISO-8601 date-time. When this index was written. |
| `days` | yes | `YYYY-MM-DD` strings, **newest first**. Each one needs a matching file in `days/`. |
| `sample` | no | `true` only for the bundled placeholder feed. The app shows a “Sample data” banner. Every title and summary must contain the word “Sample”. |

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
| `type` | yes | string | `article`, `video`, `podcast`, or `tiktok`. |
| `title` | yes | string | The headline. |
| `summary` | yes | string | One or two sentences. Shown in full on the card. |
| `source` | yes | string | Publication or show name. Search matches this. |
| `url` | yes | string | Absolute `http` or `https` link opened when the card is tapped. |
| `thumbnailUrl` | yes | string | Absolute `https` image URL. The bundled sample uses `sample:article` and similar tokens; don’t use those in a hosted feed. |
| `publishedAt` | yes | string | ISO-8601. Must fall on the file’s Eastern Time date. Newest items in an edition are shown first. |
| `paywalled` | yes | boolean | `true` draws a lock. The card still opens `url`. It does not mean the app sells the article. |
| `tags` | yes | string[] | For the curator. v1 search does **not** look at tags. Use `[]` if you have none. |

What a tap does:

- `article` — in-app browser (Safari view on iPhone)
- `video` — the `url`, so YouTube can open
- `podcast` — the `url`, so Apple Podcasts or the show page can open
- `tiktok` — the `url`, so TikTok can open

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

That example is the shape, not a story to publish. The files in this repo are labeled sample on purpose.

## Sample thumbnail tokens

Only the bundled preview understands these. A hosted feed should use normal image URLs. If an image fails, the card shows a plain colored block with the type name.

| Token | Picture |
| --- | --- |
| `sample:article` | Article |
| `sample:video` | Video |
| `sample:podcast` | Podcast |
| `sample:tiktok` | TikTok |
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
2. Edit `feed/index.json`: put that date first in `days`, and set `generatedAt` to the time you are publishing.
3. Commit both files and push to `main`.

### Noon update (the same day)

1. Edit the same `feed/days/YYYY-MM-DD.json` and add a `noon` edition. Do not add a second file. `publishedAt` is 12:00 p.m. Eastern.
2. Set `generatedAt` in `feed/index.json` to the current time. The date is already in `days`.
3. Commit and push to `main` again.

Aim for 8–12 items on a full day. The midnight edition is the main one. Noon is a short update. A shorter day is still valid.

The live `feed/` folder is the real edition: `feed/index.json` lists `2026-10-23` and has `"sample": false`, and `feed/days/2026-10-23.json` is that day’s six stories. Today shows whichever date is first in `days`, including when that date is older than the calendar day. Set `"sample": false` on the index to keep the Sample data banner off. Real `thumbnailUrl` values are `https` image addresses.

`fallback/` is the offline sample bundled into the app. GitHub Pages does not publish it. `sample:` thumbnail tokens belong there only.

After the push, wait until the **Deploy to GitHub Pages** action is green, then pull to refresh on the phone. If the action fails, the previous site stays up.

Keep the JSON public. There are no accounts in v1, so there is no private feed. A later custom domain such as `https://mormonnewsroundup.org/feed` would mean changing `FEED_BASE_URL` and shipping an app update. This repository’s Pages URL does not.

## Check the files

From the project folder, someone technical can run:

```bash
npm run check-feed
```

That checks ids, types, dates, edition names, newest-first order, and that each `publishedAt` falls on the file’s Eastern Time date. A real item’s `thumbnailUrl` must be `https`. While `index.json` has `"sample": true`, every title and summary must contain “Sample”.

A short day, a missing podcast or TikTok, or fewer than two titles that mention lawsuit is a warning, not a failure. The command still exits successfully so that edition can be pushed.

## Cache

The phone stores the index and each day in AsyncStorage after a successful download. Search reads that cache, then filters on the device. A few thousand items is the size this is built for. Pull to refresh bypasses the cache and downloads again. If the download fails, the cached copy stays on screen.
