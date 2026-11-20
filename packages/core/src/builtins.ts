/** Built-in records seeded into a fresh library. Users may edit/archive them later. */
import type { Unit } from './units';

export interface BuiltinMediaType {
  id: string;
  name: string;
  namePlural: string;
  icon: string;
  primaryUnit: Unit;
}

export const BUILTIN_MEDIA_TYPES: BuiltinMediaType[] = [
  { id: 'book', name: 'Book', namePlural: 'Books', icon: 'book', primaryUnit: 'page' },
  {
    id: 'audiobook',
    name: 'Audiobook',
    namePlural: 'Audiobooks',
    icon: 'headphones',
    primaryUnit: 'minute',
  },
  { id: 'comic', name: 'Comic', namePlural: 'Comics', icon: 'book-image', primaryUnit: 'page' },
  {
    id: 'article',
    name: 'Article',
    namePlural: 'Articles',
    icon: 'newspaper',
    primaryUnit: 'word',
  },
  {
    id: 'podcast_episode',
    name: 'Podcast episode',
    namePlural: 'Podcast episodes',
    icon: 'mic',
    primaryUnit: 'minute',
  },
  { id: 'video', name: 'Video', namePlural: 'Videos', icon: 'video', primaryUnit: 'minute' },
  { id: 'movie', name: 'Movie', namePlural: 'Movies', icon: 'film', primaryUnit: 'minute' },
  {
    id: 'course',
    name: 'Course',
    namePlural: 'Courses',
    icon: 'graduation-cap',
    primaryUnit: 'lesson',
  },
  { id: 'paper', name: 'Paper', namePlural: 'Papers', icon: 'file-text', primaryUnit: 'page' },
];

export const BUILTIN_TAG_GROUPS = [{ name: 'Genre' }, { name: 'Topic' }] as const;
