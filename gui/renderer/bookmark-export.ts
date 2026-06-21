import type { BookmarkTimelineItem, SearchResult } from '../main/ipc-types'

export type BookmarkExportItem = BookmarkTimelineItem | SearchResult

export function buildBookmarkExportJson(items: BookmarkExportItem[]): string {
  return `${JSON.stringify(items, null, 2)}\n`
}

export function bookmarkExportFilename(count: number, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `fieldtheory-bookmarks-${count}-${stamp}.json`
}

export function downloadBookmarkJson(items: BookmarkExportItem[]): void {
  if (!items.length) return

  const blob = new Blob([buildBookmarkExportJson(items)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = bookmarkExportFilename(items.length)
  link.click()
  URL.revokeObjectURL(url)
}
