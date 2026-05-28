import React, { useEffect, useState } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import { CheckCircle, Trash2, AlertTriangle, Camera } from 'lucide-react'

interface SnapshotResult {
  snapshotPath: string
  recordCount: number
  sizeBytes: number
  timestamp: string
}

export function SettingsScreen() {
  const [dataPath, setDataPath] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const [indexing, setIndexing] = useState(false)
  const [indexMsg, setIndexMsg] = useState('')

  // Snapshot state
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [snapshotting, setSnapshotting] = useState(false)
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null)

  // Remove-all state
  const [confirmed, setConfirmed] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [removeProgress, setRemoveProgress] = useState<{ done: number; total: number } | null>(null)
  const [removeResult, setRemoveResult] = useState<{ deleted: number; errors: number } | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    invoke<string>('paths:data').then(setDataPath)
    invoke<number>('bookmarks:count', {}).then(setTotal)
  }, [])

  useIpcEvent('delete:progress', (p) => {
    const data = p as { jobId: string; done: number; total: number }
    if (data.jobId === jobId) setRemoveProgress({ done: data.done, total: data.total })
  }, [jobId])

  async function rebuildIndex(force: boolean) {
    setIndexing(true)
    setIndexMsg('')
    try {
      const result = await invoke<{ recordCount: number }>('index:build', { force })
      setIndexMsg(`Index rebuilt — ${result.recordCount.toLocaleString()} records`)
    } finally {
      setIndexing(false)
      setTimeout(() => setIndexMsg(''), 4000)
    }
  }

  async function removeAllFromX() {
    if (!confirmed) return
    setRemoving(true)
    setRemoveProgress(null)
    setRemoveResult(null)
    setRemoveError(null)

    try {
      const tweetIds = await invoke<string[]>('bookmarks:allTweetIds')
      if (!tweetIds.length) {
        setRemoveError('No bookmarks found in the local library.')
        setRemoving(false)
        return
      }

      // Start job — progress streams via delete:progress event
      const result = await invoke<{ deleted: number; errors: string[] }>('bookmarks:bulkDeleteFromX', tweetIds)
      setRemoveResult({ deleted: result.deleted, errors: result.errors.length })
    } catch (e: unknown) {
      setRemoveError((e as Error).message)
    } finally {
      setRemoving(false)
      setConfirmed(false)
    }
  }

  const pct = removeProgress && removeProgress.total > 0
    ? Math.round((removeProgress.done / removeProgress.total) * 100)
    : 0

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-8">Settings</h1>

      {/* Data location */}
      <Section title="Data location">
        <p className="text-xs font-mono text-gray-400 break-all">{dataPath || '—'}</p>
        {total !== null && (
          <p className="text-xs text-gray-600 mt-1">{total.toLocaleString()} bookmarks in local library</p>
        )}
      </Section>

      {/* Search index */}
      <Section title="Search index">
        <p className="text-sm text-gray-500 mb-4">
          Rebuild the SQLite search index from the JSONL cache. Classifications are preserved unless you force-rebuild.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => rebuildIndex(false)}
            disabled={indexing}
            className="px-4 py-2 rounded text-sm bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
          >
            Rebuild index
          </button>
          <button
            onClick={() => rebuildIndex(true)}
            disabled={indexing}
            className="px-4 py-2 rounded text-sm bg-coral/10 text-coral hover:bg-coral/20 disabled:opacity-40 transition-colors"
          >
            Force rebuild (clears classification)
          </button>
        </div>
        {indexMsg && (
          <div className="flex items-center gap-2 mt-3 text-xs text-mint">
            <CheckCircle size={12} /> {indexMsg}
          </div>
        )}
      </Section>

      {/* Snapshot */}
      <Section title="Snapshot">
        <p className="text-sm text-gray-500 mb-4">
          Save a point-in-time backup of your library — JSONL (source of truth) + SQL dump
          with all classifications. Snapshots land in <code className="text-gray-400">~/.fieldtheory/bookmarks/snapshots/</code>.
        </p>
        <div className="flex gap-2 mb-4">
          <input
            value={snapshotLabel}
            onChange={(e) => setSnapshotLabel(e.target.value)}
            placeholder="optional label (e.g. before-delete)"
            disabled={snapshotting}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-lavender/40 transition"
          />
          <button
            onClick={async () => {
              setSnapshotting(true)
              setSnapshotResult(null)
              try {
                const r = await invoke<SnapshotResult>('bookmarks:snapshot', snapshotLabel || undefined)
                setSnapshotResult(r)
              } finally {
                setSnapshotting(false)
              }
            }}
            disabled={snapshotting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-lavender/20 text-lavender text-sm hover:bg-lavender/30 disabled:opacity-40 transition-colors"
          >
            <Camera size={14} />
            {snapshotting ? 'Saving…' : 'Take snapshot'}
          </button>
        </div>
        {snapshotResult && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-mint/10 border border-mint/20">
            <CheckCircle size={14} className="text-mint mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="text-gray-200 mb-0.5">
                {snapshotResult.recordCount.toLocaleString()} bookmarks · {(snapshotResult.sizeBytes / 1024).toFixed(0)} KB
              </p>
              <p className="text-gray-500 font-mono break-all">{snapshotResult.snapshotPath}</p>
            </div>
          </div>
        )}
      </Section>

      {/* Remove all from X */}
      <Section title="Remove all bookmarks from X">
        <p className="text-sm text-gray-500 mb-4">
          Un-bookmark all {total !== null ? <strong className="text-gray-300">{total.toLocaleString()}</strong> : 'your'} locally-synced bookmarks from your X account.
          Your local library is kept — only your X bookmark list is cleared.
        </p>

        <div className="p-4 rounded-lg bg-amber/5 border border-amber/20 mb-4 flex gap-3">
          <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400 leading-relaxed">
            This will send a delete request for every bookmark in your local library.
            It cannot be undone on X. Your local <code className="text-gray-300">bookmarks.jsonl</code> is not affected.
          </p>
        </div>

        {!removing && !removeResult && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="accent-coral"
              />
              <span className="text-sm text-gray-400">
                I understand — remove all from X
              </span>
            </label>
            <button
              onClick={removeAllFromX}
              disabled={!confirmed}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm bg-coral/20 text-coral hover:bg-coral/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={14} />
              Remove all from X
            </button>
          </div>
        )}

        {removing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>
                {removeProgress
                  ? `Removing ${removeProgress.done.toLocaleString()} / ${removeProgress.total.toLocaleString()}`
                  : 'Loading bookmark IDs…'}
              </span>
              {removeProgress && <span>{pct}%</span>}
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-coral/60 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-600">
              Requests are rate-limited to 250 ms apart. This may take a few minutes for large libraries.
            </p>
          </div>
        )}

        {removeResult && (
          <div className="p-4 rounded-lg bg-mint/10 border border-mint/20">
            <p className="text-sm text-gray-200 font-medium mb-1">Done</p>
            <p className="text-xs text-gray-400">
              {removeResult.deleted.toLocaleString()} removed from X
              {removeResult.errors > 0 && (
                <span className="text-coral ml-2">· {removeResult.errors} failed (session may have expired)</span>
              )}
            </p>
          </div>
        )}

        {removeError && (
          <div className="p-4 rounded-lg bg-coral/10 border border-coral/20">
            <p className="text-sm text-coral">{removeError}</p>
            <p className="text-xs text-gray-600 mt-1">
              Make sure Chrome or Firefox is open and logged into X, then try again.
            </p>
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">{title}</h2>
      {children}
    </div>
  )
}
