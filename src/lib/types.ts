export type ContentType = "post" | "article";
export type MediaType = "image" | "video" | "audio";
export type AppRole = "admin" | "reader";

export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string;
  alt?: string;
}

export interface Author {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  links: { label: string; url: string }[];
}

export interface BaseEntry {
  id: string;
  type: ContentType;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  draft: boolean;
  views: number;
  likes: number;
  comments: number;
  bookmarked: boolean;
  liked: boolean;
  slug?: string;
}

export interface ShortPost extends BaseEntry {
  type: "post";
  body: string;
  media: MediaAttachment[];
}

export interface Article extends BaseEntry {
  type: "article";
  title: string;
  subtitle?: string;
  coverUrl?: string;
  showCoverOnArticle: boolean;
  contentHtml: string;
  readingMinutes: number;
  media: MediaAttachment[];
}

export type Entry = ShortPost | Article;

export interface Comment {
  id: string;
  entryId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  likes: number;
  liked: boolean;
}
