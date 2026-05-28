import React, { useState } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import { Tag, CheckCircle, XCircle } from 'lucide-react'

interface ClassifyProgress {
  jobId: string
  done: number
  total: number
  phase: 'categories' | 'domains'
}

export function ClassifyScreen() {
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<ClassifyProgress | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetFirst, setResetFirst] = useState(false)
  const [engine, setEngine] = useState('')

  useIpcEvent('classify:progress', (p) => {
    const data = p as ClassifyProgress
    if (data.jobId === jobId || (jobId === null && running)) {
      if (jobId === null) setJobId(data.jobId)
      setProgress(data)
    }
  }, [jobId, running])

  useIpcEvent('classify:done', (p) => {
    const data = p as { jobId: string }
    if (data.jobId === jobId || (jobId === null && running)) {
      if (jobId === null) setJobId(data.jobId)
      setDone(true); setRunning(false)
    }
  }, [jobId, running])

  useIpcEvent('classify:error', (p) => {
    const data = p as { jobId: string; error: string }
    if (data.jobId === jobId || (jobId === null && running)) {
      if (jobId === null) setJobId(data.jobId)
      setError(data.error); setRunning(false)
    }
  }, [jobId, running])

  async function startClassify() {
    setRunning(true)
    setJobId(null)
    setProgress(null)
    setDone(false)
    setError(null)
    const result = await invoke<{ jobId: string }>('classify:llm:start', {
      engine: engine || undefined,
      resetFirst,
    })
    setJobId(result.jobId)
  }

  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-1">Classify Bookmarks</h1>
      <p className="text-sm text-gray-600 mb-8">
        Uses an LLM (Claude, Codex, or OpenAI-compatible API) to categorize unclassified bookmarks.
      </p>

      <div className="space-y-4 mb-8">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Engine override (optional)</label>
          <input
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            placeholder="claude, codex, or api endpoint…"
            disabled={running}
            className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-lavender/40 transition"
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={resetFirst}
            onChange={(e) => setResetFirst(e.target.checked)}
            disabled={running}
            className="accent-coral"
          />
          <div>
            <p className="text-sm text-gray-300">Reset all classifications first</p>
            <p className="text-xs text-gray-600">Re-classify from scratch (clears existing categories)</p>
          </div>
        </label>
      </div>

      <button
        onClick={startClassify}
        disabled={running}
        className="flex items-center gap-2 px-6 py-3 rounded-lg bg-lavender/20 text-lavender font-medium text-sm hover:bg-lavender/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mb-8"
      >
        <Tag size={16} />
        {running ? 'Classifying…' : 'Start classify'}
      </button>

      {running && progress && (
        <div className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06] space-y-2">
          <p className="text-sm text-gray-400 capitalize">{progress.phase}: {progress.done} / {progress.total}</p>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-lavender/60 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{pct}%</p>
        </div>
      )}

      {done && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-mint/10 border border-mint/20">
          <CheckCircle size={18} className="text-mint mt-0.5 shrink-0" />
          <p className="text-sm text-gray-200">Classification complete.</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-coral/10 border border-coral/20">
          <XCircle size={18} className="text-coral mt-0.5 shrink-0" />
          <p className="text-sm text-gray-300">{error}</p>
        </div>
      )}
    </div>
  )
}
