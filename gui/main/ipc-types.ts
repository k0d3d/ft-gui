import type {
  BookmarkTimelineItem,
  BookmarkTimelineFilters,
  SearchResult,
  SearchOptions,
} from '../../src/bookmarks-db.js'
import type { BookmarkStatusView } from '../../src/bookmarks-service.js'

export type {
  BookmarkTimelineItem,
  BookmarkTimelineFilters,
  SearchResult,
  SearchOptions,
  BookmarkStatusView,
}

// ── Progress event payloads ────────────────────────────────────────────────

export interface SyncProgressEvent {
  jobId: string
  page: number
  totalFetched: number
  newAdded: number
  done: boolean
  stopReason?: string
}

export interface ClassifyProgressEvent {
  jobId: string
  done: number
  total: number
  phase: 'categories' | 'domains'
}

export interface DeleteProgressEvent {
  jobId: string
  done: number
  total: number
}

export interface DeleteDoneEvent {
  jobId: string
  deleted: number
  errors: number
}

export interface DeleteErrorEvent {
  jobId: string
  error: string
}

export interface MediaProgressEvent {
  jobId: string
  done: number
  total: number
  bytes: number
}

// ── Sync options (GUI subset) ──────────────────────────────────────────────

export interface SyncGuiOptions {
  rebuild?: boolean
  removeAfterSync?: boolean
}

export interface ClassifyGuiOptions {
  engine?: string
  model?: string
  resetFirst?: boolean
}

// ── IPC channel map (for documentation / type safety) ─────────────────────
// These are the request-reply channels (ipcMain.handle / ipcRenderer.invoke)

export interface IpcChannels {
  'bookmarks:list': [filters: BookmarkTimelineFilters, result: BookmarkTimelineItem[]]
  'bookmarks:count': [filters: BookmarkTimelineFilters, result: number]
  'bookmarks:search': [opts: SearchOptions, result: SearchResult[]]
  'bookmarks:get': [id: string, result: BookmarkTimelineItem | null]
  'bookmarks:resetClassification': [ids: string[], result: { count: number }]
  'bookmarks:bulkDeleteFromX:start': [opts: { tweetIds?: string[] } | undefined, result: { jobId: string }]
  'stats:get': [
    filters: undefined,
    result: {
      totalBookmarks: number
      uniqueAuthors: number
      dateRange: { earliest: string | null; latest: string | null }
      topAuthors: { handle: string; count: number }[]
      languageBreakdown: { language: string; count: number }[]
    },
  ]
  'categories:counts': [filters: undefined, result: Record<string, number>]
  'domains:counts': [filters: undefined, result: Record<string, number>]
  'folders:counts': [
    filters: undefined,
    result: { counts: Record<string, number>; untagged: number },
  ]
  'status:get': [filters: undefined, result: BookmarkStatusView]
  'index:build': [opts: { force?: boolean }, result: { recordCount: number; newRecords: number }]
  'classify:regex': [
    filters: undefined,
    result: { recordCount: number; summary: Record<string, number> },
  ]
  'paths:data': [filters: undefined, result: string]
  'sync:start': [opts: SyncGuiOptions, result: { jobId: string }]
  'classify:llm:start': [opts: ClassifyGuiOptions, result: { jobId: string }]
  'media:fetch:start': [opts: { limit?: number }, result: { jobId: string }]
}
