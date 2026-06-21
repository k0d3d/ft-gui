import { invoke } from './hooks/useIpc'
import type { BookmarkMediaView, BookmarkTimelineItem, SearchResult } from '../main/ipc-types'

export type BookmarkExportItem = BookmarkTimelineItem | SearchResult
export type BookmarkExportMediaMap = Map<string, BookmarkMediaView[]>

export interface DownloadedMediaExportEntry {
  sourceUrl: string
  localPath: string
  contentType?: string
  bytes?: number
  fetchedAt: string
}

export type BookmarkExportRecord = BookmarkExportItem & {
  downloadedMedia?: DownloadedMediaExportEntry[]
}

function toDownloadedMediaExport(media: BookmarkMediaView[]): DownloadedMediaExportEntry[] {
  return media.map((entry) => ({
    sourceUrl: entry.sourceUrl,
    localPath: entry.localPath,
    contentType: entry.contentType,
    bytes: entry.bytes,
    fetchedAt: entry.fetchedAt,
  }))
}

export function buildBookmarkExportRecords(
  items: BookmarkExportItem[],
  mediaByBookmarkId: BookmarkExportMediaMap = new Map(),
): BookmarkExportRecord[] {
  return items.map((item) => {
    const media = mediaByBookmarkId.get(item.id) ?? []
    if (media.length === 0) return item
    return {
      ...item,
      downloadedMedia: toDownloadedMediaExport(media),
    }
  })
}

export function buildBookmarkExportJson(
  items: BookmarkExportItem[],
  mediaByBookmarkId: BookmarkExportMediaMap = new Map(),
): string {
  return `${JSON.stringify(buildBookmarkExportRecords(items, mediaByBookmarkId), null, 2)}\n`
}

export function bookmarkExportFilename(count: number, now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `fieldtheory-bookmarks-${count}-${stamp}.json`
}

export function downloadBookmarkJson(
  items: BookmarkExportItem[],
  mediaByBookmarkId: BookmarkExportMediaMap = new Map(),
): void {
  if (!items.length) return

  const blob = new Blob([buildBookmarkExportJson(items, mediaByBookmarkId)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = bookmarkExportFilename(items.length)
  link.click()
  URL.revokeObjectURL(url)
}

export async function loadDownloadedMediaForExport(items: BookmarkExportItem[]): Promise<BookmarkExportMediaMap> {
  const entries = await Promise.all(
    items.map(async (item) => [
      item.id,
      await invoke<BookmarkMediaView[]>('media:bookmark', item.id),
    ] as const),
  )
  return new Map(entries.filter(([, media]) => media.length > 0))
}
