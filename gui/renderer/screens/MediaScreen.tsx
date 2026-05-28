import React, { useState } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import { Image, CheckCircle, XCircle } from 'lucide-react'

export function MediaScreen() {
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; downloaded: number } | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState('')

  useIpcEvent('media:progress', (p) => {
    const data = p as { jobId: string; done: number; total: number; downloaded: number }
    if (data.jobId === jobId || (jobId === null && running)) {
      if (jobId === null) setJobId(data.jobId)
      setProgress(data)
    }
  }, [jobId, running])

  useIpcEvent('media:done', (p) => {
    const data = p as { jobId: string }
    if (data.jobId === jobId || (jobId === null && running)) {
      if (jobId === null) setJobId(data.jobId)
      setDone(true); setRunning(false)
    }
  }, [jobId, running])

  useIpcEvent('media:error', (p) => {
    const data = p as { jobId: string; error: string }
    if (data.jobId === jobId || (jobId === null && running)) {
      if (jobId === null) setJobId(data.jobId)
      setError(data.error); setRunning(false)
    }
  }, [jobId, running])

  async function start() {
    setRunning(true)
    setJobId(null)
    setProgress(null)
    setDone(false)
    setError(null)
    const result = await invoke<{ jobId: string }>('media:fetch:start', {
      limit: limit ? parseInt(limit, 10) : undefined,
    })
    setJobId(result.jobId)
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-1">Fetch Media</h1>
      <p className="text-sm text-gray-600 mb-8">Download images and video posters for bookmarks.</p>

      <div className="mb-6">
        <label className="text-xs text-gray-500 mb-1 block">Limit (optional)</label>
        <input
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder="e.g. 100"
          type="number"
          disabled={running}
          className="w-32 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-lavender/40 transition"
        />
      </div>

      <button
        onClick={start}
        disabled={running}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-lavender/20 text-lavender font-medium text-sm hover:bg-lavender/30 disabled:opacity-40 transition-colors mb-8"
      >
        <Image size={16} />
        {running ? 'Fetching…' : 'Fetch media'}
      </button>

      {running && progress && (
        <div className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-2">
          <p className="text-sm text-gray-400">{progress.done} / {progress.total} processed · {progress.downloaded} downloaded</p>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-lavender/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-mint/10 border border-mint/20">
          <CheckCircle size={18} className="text-mint mt-0.5" />
          <p className="text-sm text-gray-200">Media fetch complete.</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-coral/10 border border-coral/20">
          <XCircle size={18} className="text-coral mt-0.5" />
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      )}
    </div>
  )
}
