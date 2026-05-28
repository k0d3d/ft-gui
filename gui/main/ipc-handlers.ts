import { ipcMain, BrowserWindow } from 'electron'
import {
  listBookmarks,
  countBookmarks,
  searchBookmarks,
  getBookmarkById,
  getStats,
  getCategoryCounts,
  getDomainCounts,
  getFolderCounts,
  classifyAndRebuild,
  buildIndex,
  getAllTweetIds,
  snapshotBookmarks,
  listSnapshots,
  restoreSnapshot,
} from '../../src/bookmarks-db.js'
import { getBookmarkStatusView } from '../../src/bookmarks-service.js'
import { dataDir } from '../../src/paths.js'
import { syncBookmarksGraphQL, detectValidSessions } from '../../src/graphql-bookmarks.js'
import { classifyWithLlm, classifyDomainsWithLlm } from '../../src/bookmark-classify-llm.js'
import { fetchBookmarkMediaBatch } from '../../src/bookmark-media.js'
import { resolveEngine } from '../../src/engine.js'
import { getVizData } from '../../src/bookmarks-viz.js'
import type {
  BookmarkTimelineFilters,
  SearchOptions,
  SyncGuiOptions,
  ClassifyGuiOptions,
} from './ipc-types.js'

export function registerIpcHandlers(win: BrowserWindow): void {
  // ── Bookmarks ────────────────────────────────────────────────────────────

  ipcMain.handle('bookmarks:list', (_e, filters: BookmarkTimelineFilters) =>
    listBookmarks(filters)
  )

  ipcMain.handle('bookmarks:count', (_e, filters: BookmarkTimelineFilters) =>
    countBookmarks(filters)
  )

  ipcMain.handle('bookmarks:search', (_e, opts: SearchOptions) =>
    searchBookmarks(opts)
  )

  ipcMain.handle('bookmarks:get', (_e, id: string) =>
    getBookmarkById(id)
  )

  ipcMain.handle('bookmarks:resetClassification', async (_e, ids: string[]) => {
    const { resetClassification } = await import('../../src/bookmarks-db.js')
    return resetClassification(ids)
  })

  ipcMain.handle('bookmarks:allTweetIds', () => getAllTweetIds())

  ipcMain.handle('bookmarks:snapshot', (_e, label?: string) => snapshotBookmarks(label))
  ipcMain.handle('bookmarks:listSnapshots', () => listSnapshots())
  ipcMain.handle('bookmarks:restoreSnapshot', (_e, snapshotPath: string) => restoreSnapshot(snapshotPath))

  ipcMain.handle('bookmarks:bulkDeleteFromX', async (_e, tweetIds: string[]) => {
    const { deleteXBookmarks } = await import('../../src/bookmark-delete.js')
    const sessions = await detectValidSessions()
    if (!sessions.length) {
      return {
        deleted: 0,
        errors: ['No browser session found. Open x.com in Chrome or Firefox first.'],
      }
    }
    const jobId = crypto.randomUUID()
    return deleteXBookmarks(tweetIds, sessions[0], (done, total) => {
      win.webContents.send('delete:progress', { jobId, done, total })
    })
  })

  // ── Stats & counts ───────────────────────────────────────────────────────

  ipcMain.handle('stats:get', () => getStats())

  ipcMain.handle('categories:counts', () => getCategoryCounts())

  ipcMain.handle('domains:counts', () => getDomainCounts())

  ipcMain.handle('folders:counts', () => getFolderCounts())

  // ── System ───────────────────────────────────────────────────────────────

  ipcMain.handle('status:get', () => getBookmarkStatusView())

  ipcMain.handle('paths:data', () => dataDir())

  ipcMain.handle('index:build', (_e, opts: { force?: boolean }) => buildIndex(opts))

  ipcMain.handle('classify:regex', () => classifyAndRebuild())

  ipcMain.handle('viz:getData', () => getVizData())

  // ── Long-running: sync ───────────────────────────────────────────────────

  ipcMain.handle('sync:start', async (_e, opts: SyncGuiOptions) => {
    const jobId = crypto.randomUUID()

    syncBookmarksGraphQL({
      incremental: !opts.rebuild,
      onProgress: (p) => {
        win.webContents.send('sync:progress', { ...p, jobId })
      },
    })
      .then(async (result) => {
        const indexResult = await buildIndex()
        win.webContents.send('sync:done', {
          jobId,
          totalBookmarks: result.totalBookmarks,
          added: result.added,
          recordCount: indexResult.recordCount,
          stopReason: result.stopReason,
        })
      })
      .catch((err: Error) => {
        win.webContents.send('sync:error', { jobId, error: err.message })
      })

    return { jobId }
  })

  // ── Long-running: LLM classify ───────────────────────────────────────────

  ipcMain.handle('classify:llm:start', async (_e, opts: ClassifyGuiOptions) => {
    const jobId = crypto.randomUUID()

    Promise.resolve()
      .then(async () => {
        if (opts.resetFirst) {
          const { resetClassification } = await import('../../src/bookmarks-db.js')
          await resetClassification([])
        }

        const engine = await resolveEngine({ name: opts.engine, model: opts.model })

        const catResult = await classifyWithLlm({
          engine,
          onBatch: (done, total) => {
            win.webContents.send('classify:progress', { jobId, done, total, phase: 'categories' })
          },
        })

        const domResult = await classifyDomainsWithLlm({
          engine,
          onBatch: (done, total) => {
            win.webContents.send('classify:progress', { jobId, done, total, phase: 'domains' })
          },
        })

        win.webContents.send('classify:done', { jobId, catResult, domResult })
      })
      .catch((err: Error) => {
        win.webContents.send('classify:error', { jobId, error: err.message })
      })

    return { jobId }
  })

  // ── Long-running: fetch media ────────────────────────────────────────────

  ipcMain.handle('media:fetch:start', async (_e, opts: { limit?: number }) => {
    const jobId = crypto.randomUUID()

    fetchBookmarkMediaBatch({
      limit: opts.limit,
      onProgress: (p) => {
        win.webContents.send('media:progress', {
          jobId,
          done: p.processed,
          total: p.candidateBookmarks,
          downloaded: p.downloaded,
        })
      },
    })
      .then((result) => {
        win.webContents.send('media:done', { jobId, ...result })
      })
      .catch((err: Error) => {
        win.webContents.send('media:error', { jobId, error: err.message })
      })

    return { jobId }
  })
}
