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
  snapshotBookmarks,
  listSnapshots,
  restoreSnapshot,
} from '../../src/bookmarks-db.js'
import { getBookmarkStatusView } from '../../src/bookmarks-service.js'
import { dataDir } from '../../src/paths.js'
import { syncBookmarksGraphQL } from '../../src/graphql-bookmarks.js'
import { classifyWithLlm, classifyDomainsWithLlm } from '../../src/bookmark-classify-llm.js'
import { fetchBookmarkMediaBatch } from '../../src/bookmark-media.js'
import { resolveEngine } from '../../src/engine.js'
import { getVizData } from '../../src/bookmarks-viz.js'
import { runHealthChecks, autoHealDeleteQueryId } from '../../src/health-check.js'
import { loadPreferences, savePreferences } from '../../src/preferences.js'
import { startDeleteBookmarksJob } from './delete-job.js'
import { getStartupMetrics } from './performance.js'
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

  ipcMain.handle('bookmarks:snapshot', (_e, label?: string) => snapshotBookmarks(label))
  ipcMain.handle('bookmarks:listSnapshots', () => listSnapshots())
  ipcMain.handle('bookmarks:restoreSnapshot', (_e, snapshotPath: string) => restoreSnapshot(snapshotPath))

  ipcMain.handle('bookmarks:bulkDeleteFromX:start', async (_e, opts?: { tweetIds?: string[] }) => {
    const { jobId } = startDeleteBookmarksJob({
      tweetIds: opts?.tweetIds,
      emit: (channel, payload) => {
        win.webContents.send(channel, payload)
      },
    })

    return { jobId }
  })

  // ── Stats & counts ───────────────────────────────────────────────────────

  ipcMain.handle('stats:get', () => getStats())

  ipcMain.handle('categories:counts', () => getCategoryCounts())

  ipcMain.handle('domains:counts', () => getDomainCounts())

  ipcMain.handle('folders:counts', () => getFolderCounts())

  // ── System ───────────────────────────────────────────────────────────────

  ipcMain.handle('status:get', () => getBookmarkStatusView())

  ipcMain.handle('paths:data', () => dataDir())

  ipcMain.handle('preferences:getOpenAi', () => {
    const prefs = loadPreferences()
    return {
      baseUrl: prefs.openaiBaseUrl?.trim() || 'https://api.openai.com/v1',
      model: prefs.openaiModel?.trim() || 'gpt-4o',
      hasApiKey: Boolean(prefs.openaiApiKey?.trim()),
    }
  })

  ipcMain.handle('preferences:saveOpenAi', (_e, opts: { baseUrl?: string; model?: string; apiKey?: string; clearApiKey?: boolean }) => {
    const prefs = loadPreferences()
    const next = { ...prefs }
    const trimmedBaseUrl = opts.baseUrl?.trim()
    const trimmedModel = opts.model?.trim()
    const trimmedApiKey = opts.apiKey?.trim()

    next.openaiBaseUrl = trimmedBaseUrl || 'https://api.openai.com/v1'
    next.openaiModel = trimmedModel || 'gpt-4o'
    if (opts.clearApiKey) {
      delete next.openaiApiKey
    } else if (trimmedApiKey) {
      next.openaiApiKey = trimmedApiKey
    }

    savePreferences(next)

    return {
      baseUrl: next.openaiBaseUrl,
      model: next.openaiModel,
      hasApiKey: Boolean(next.openaiApiKey?.trim()),
    }
  })

  ipcMain.handle('app:performance:get', () => ({
    startup: getStartupMetrics(),
  }))

  ipcMain.handle('index:build', (_e, opts: { force?: boolean }) => buildIndex(opts))

  ipcMain.handle('classify:regex', () => classifyAndRebuild())

  ipcMain.handle('viz:getData', () => getVizData())

  ipcMain.handle('health:run', () => runHealthChecks())
  ipcMain.handle('health:autofix', () => autoHealDeleteQueryId())

  // ── Long-running: sync ───────────────────────────────────────────────────

  ipcMain.handle('sync:start', async (_e, opts: SyncGuiOptions) => {
    const jobId = crypto.randomUUID()

    setTimeout(() => {
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
    }, 0)

    return { jobId }
  })

  // ── Long-running: LLM classify ───────────────────────────────────────────

  ipcMain.handle('classify:llm:start', async (_e, opts: ClassifyGuiOptions) => {
    const jobId = crypto.randomUUID()

    setTimeout(() => {
      Promise.resolve()
        .then(async () => {
          if (opts.resetFirst) {
            const { resetClassification } = await import('../../src/bookmarks-db.js')
            await resetClassification([])
          }

          const engine = await resolveEngine({ engine: opts.engine, model: opts.model })

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
    }, 0)

    return { jobId }
  })

  // ── Long-running: fetch media ────────────────────────────────────────────

  ipcMain.handle('media:fetch:start', async (_e, opts: { limit?: number }) => {
    const jobId = crypto.randomUUID()

    setTimeout(() => {
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
    }, 0)

    return { jobId }
  })
}
