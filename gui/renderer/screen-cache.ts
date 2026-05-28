import type { Screen } from './app';

export const BASE_SCREEN_NAMES = [
  'dashboard',
  'list',
  'search',
  'sync',
  'classify',
  'stats',
  'viz',
  'categories',
  'domains',
  'folders',
  'media',
  'settings',
] as const;

export type BaseScreenName = (typeof BASE_SCREEN_NAMES)[number];

export function isBaseScreenName(screen: Screen): screen is BaseScreenName {
  return typeof screen === 'string' && (BASE_SCREEN_NAMES as readonly string[]).includes(screen);
}

export function nextMountedScreenNames(current: BaseScreenName[], screen: Screen): BaseScreenName[] {
  if (!isBaseScreenName(screen) || current.includes(screen)) return current;
  return [...current, screen];
}
