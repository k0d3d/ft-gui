import React, { useState } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react'

interface SyncProgress {
  jobId: string
  page: number
  totalFetched: number
  newAdded: number
  done: boolean
  stopReason?: string
}

interface SyncDone {
  jobId: string
  totalBookmarks: number
  added: number
  recordCount: number
  stopReason: string
}

export function SyncScreen() {
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [done, setDone] = useState<SyncDone | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rebuild, setRebuild] = useState(false)
  const [removeAfterSync, setRemoveAfterSync] = useState(false)

  useIpcEvent('sync:progress', (p) => {
    const data = p as SyncProgress
    if (data.jobId === jobId) setProgress(data)
  }, [jobId])

  useIpcEvent('sync:done', (p) => {
    const data = p as SyncDone
    if (data.jobId === jobId) { setDone(data); setRunning(false) }
  }, [jobId])

  useIpcEvent('sync:error', (p) => {
    const data = p as { jobId: string; error: string }
    if (data.jobId === jobId) { setError(data.error); setRunning(false) }
  }, [jobId])

  async function startSync() {
    setRunning(true)
    setProgress(null)
    setDone(null)
    setError(null)
    const result = await invoke<{ jobId: string }>('sync:start', { rebuild, removeAfterSync })
    setJobId(result.jobId)
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-1">Sync Bookmarks</h1>
      <p className="text-sm text-gray-600 mb-8">
        Pulls bookmarks from X using your browser session (Chrome or Firefox).
      </p>

      {/* Options */}
      <div className="space-y-3 mb-8">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={rebuild}
            onChange={(e) => setRebuild(e.target.checked)}
            disabled={running}
            className="accent-lavender"
          />
          <div>
            <p className="text-sm text-gray-300">Full rebuild</p>
            <p className="text-xs text-gray-600">Fetch all bookmarks (not just new ones)</p>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={removeAfterSync}
            onChange={(e) => setRemoveAfterSync(e.target.checked)}
            disabled={running}
            className="accent-coral"
          />
          <div>
            <p className="text-sm text-gray-300">Remove from X after sync</p>
            <p className="text-xs text-gray-600">Un-bookmark synced items from X (keep locally)</p>
          </div>
        </label>
      </div>

      {/* Start button */}
      <button
        onClick={startSync}
        disabled={running}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-lavender/20 text-lavender font-medium text-sm hover:bg-lavender/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-8"
      >
        <RefreshCw size={16} className={running ? 'animate-spin' : ''} />
        {running ? 'Syncing…' : 'Start sync'}
      </button>

      {/* Progress */}
      {running && progress && (
        <div className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm space-y-1">
          <p className="text-gray-400">Page {progress.page} · {progress.totalFetched} fetched · {progress.newAdded} new</p>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-lavender/60 rounded-full transition-all"
              style={{ width: `${Math.min(100, (progress.newAdded / Math.max(progress.totalFetched, 1)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Done */}
      {done && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-mint/10 border border-mint/20">
          <CheckCircle size={18} className="text-mint mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-gray-200 font-medium">Sync complete</p>
            <p className="text-gray-400">{done.added} new · {done.totalBookmarks.toLocaleString()} total · {done.stopReason}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-coral/10 border border-coral/20">
          <XCircle size={18} className="text-coral mt-0.5 shrink-0" />
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      )}
    </div>
  )
}
