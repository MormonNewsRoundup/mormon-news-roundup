export type ContentType = 'article' | 'video' | 'podcast' | 'tiktok';

export type EditionName = 'midnight' | 'noon';

export type TypeFilter = 'all' | ContentType;

export type FeedItem = {
  id: string;
  type: ContentType;
  title: string;
  summary: string;
  source: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
  paywalled: boolean;
  tags: string[];
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

export const CONTENT_TYPES: ContentType[] = ['article', 'video', 'podcast', 'tiktok'];

export function typeLabel(type: ContentType): string {
  switch (type) {
    case 'article':
      return 'Article';
    case 'video':
      return 'Video';
    case 'podcast':
      return 'Podcast';
    case 'tiktok':
      return 'TikTok';
  }
}

export function filterLabel(filter: TypeFilter): string {
  if (filter === 'all') return 'All';
  if (filter === 'article') return 'Articles';
  if (filter === 'video') return 'Videos';
  if (filter === 'podcast') return 'Podcasts';
  return 'TikToks';
}
