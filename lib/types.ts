export type ContentType = 'article' | 'video' | 'podcast' | 'reddit';

export type EditionName = 'midnight' | 'noon';

export type TypeFilter = 'all' | ContentType;

export type FeedItem = {
  id: string;
  type: ContentType;
  title: string;
  summary: string;
  source: string;
  url: string;
  /** Required https image, except a reddit item may omit it or leave it empty. */
  thumbnailUrl?: string;
  publishedAt: string;
  paywalled: boolean;
  tags: string[];
  /** Optional. Example: "r/exmormon". The card does not print this on its own. */
  subreddit?: string;
  /** Optional internal metadata. The card does not show this. */
  satire?: boolean;
};

export type Edition = {
  name: EditionName;
  publishedAt: string;
  items: FeedItem[];
};

export type DayFile = {
  date: string;
  sample?: boolean;
  editions: Edition[];
};

export type FeedIndex = {
  generatedAt: string;
  sample?: boolean;
  days: string[];
};

export const CONTENT_TYPES: ContentType[] = ['article', 'video', 'podcast', 'reddit'];

export function typeLabel(type: ContentType): string {
  switch (type) {
    case 'article':
      return 'Article';
    case 'video':
      return 'Video';
    case 'podcast':
      return 'Podcast';
    case 'reddit':
      return 'Reddit';
  }
}

export function filterLabel(filter: TypeFilter): string {
  switch (filter) {
    case 'all':
      return 'All';
    case 'article':
      return 'Articles';
    case 'video':
      return 'Videos';
    case 'podcast':
      return 'Podcasts';
    case 'reddit':
      return 'Reddit';
  }
}
