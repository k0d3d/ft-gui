import React, { useEffect, useState, useCallback } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import { CheckCircle, Trash2, AlertTriangle, Camera, RotateCcw, RefreshCw, Activity, Zap } from 'lucide-react'
import type { OpenAiSettingsView, StartupMetric } from '../../main/ipc-types'

interface SnapshotResult {
  snapshotPath: string
  recordCount: number
  sizeBytes: number
  timestamp: string
}

interface SnapshotInfo {
  snapshotPath: string
  timestamp: string
  label: string | null
  recordCount: number
}

export function SettingsScreen() {
  const [dataPath, setDataPath] = useState('')
  const [total, setTotal] = useState<number | null>(null)
  const [indexing, setIndexing] = useState(false)
  const [indexMsg, setIndexMsg] = useState('')
  const [openAi, setOpenAi] = useState<OpenAiSettingsView | null>(null)
  const [openAiBaseUrl, setOpenAiBaseUrl] = useState('https://api.openai.com/v1')
  const [openAiApiKey, setOpenAiApiKey] = useState('')
  const [openAiSaving, setOpenAiSaving] = useState(false)
  const [openAiMsg, setOpenAiMsg] = useState<string | null>(null)
  const [startupMetrics, setStartupMetrics] = useState<StartupMetric[]>([])

  // Diagnostics state
  type CheckStatus = 'ok' | 'warn' | 'error' | 'skip'
  interface CheckResult {
    id: string; name: string; category: string; status: CheckStatus
    detail: string; fix?: string; autofixable?: boolean
  }
  interface HealthReport { checks: CheckResult[]; ranAt: string; critical: boolean }
  const [health, setHealth] = useState<HealthReport | null>(null)
  const [healthRunning, setHealthRunning] = useState(false)
  const [autofixing, setAutofixing] = useState(false)
  const [autofixResult, setAutofixResult] = useState<string | null>(null)

  async function runHealth() {
    setHealthRunning(true)
    setAutofixResult(null)
    try {
      const r = await invoke<HealthReport>('health:run')
      setHealth(r)
    } finally {
      setHealthRunning(false)
    }
  }

  async function runAutofix() {
    setAutofixing(true)
    setAutofixResult(null)
    try {
      const r = await invoke<{ found: boolean; queryId?: string; error?: string }>('health:autofix')
      if (r.found) {
        setAutofixResult(`✓ QueryId updated to ${r.queryId} — re-running checks…`)
        await runHealth()
      } else {
        setAutofixResult(`✗ Auto-update failed: ${r.error}`)
      }
    } finally {
      setAutofixing(false)
    }
  }

  // Snapshot state
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [snapshotting, setSnapshotting] = useState(false)
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null)

  // Load snapshot state
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null) // path being restored
  const [restoreResult, setRestoreResult] = useState<{ path: string; count: number } | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null) // path awaiting confirm

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true)
    try {
      const list = await invoke<SnapshotInfo[]>('bookmarks:listSnapshots')
      setSnapshots(list)
    } finally {
      setSnapshotsLoading(false)
    }
  }, [])

  useEffect(() => { loadSnapshots() }, [loadSnapshots])

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
    invoke<OpenAiSettingsView>('preferences:getOpenAi').then((prefs) => {
      setOpenAi(prefs)
      setOpenAiBaseUrl(prefs.baseUrl)
    })
    invoke<{ startup: StartupMetric[] }>('app:performance:get').then((report) => {
      setStartupMetrics(report.startup)
    })
  }, [])

  useIpcEvent('delete:progress', (p) => {
    const data = p as { jobId: string; done: number; total: number }
    if (data.jobId === jobId || (jobId === null && removing)) {
      if (jobId === null) setJobId(data.jobId)
      setRemoveProgress({ done: data.done, total: data.total })
    }
  }, [jobId, removing])

  useIpcEvent('delete:done', (p) => {
    const data = p as { jobId: string; deleted: number; errors: number }
    if (data.jobId === jobId || (jobId === null && removing)) {
      if (jobId === null) setJobId(data.jobId)
      setRemoveResult({ deleted: data.deleted, errors: data.errors })
      setRemoving(false)
      setConfirmed(false)
    }
  }, [jobId, removing])

  useIpcEvent('delete:error', (p) => {
    const data = p as { jobId: string; error: string }
    if (data.jobId === jobId || (jobId === null && removing)) {
      if (jobId === null) setJobId(data.jobId)
      setRemoveError(data.error)
      setRemoving(false)
      setConfirmed(false)
    }
  }, [jobId, removing])

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
    setJobId(null)

    try {
      const result = await invoke<{ jobId: string }>('bookmarks:bulkDeleteFromX:start')
      setJobId(result.jobId)
    } catch (e: unknown) {
      setRemoveError((e as Error).message)
      setRemoving(false)
      setConfirmed(false)
    }
  }

  const pct = removeProgress && removeProgress.total > 0
    ? Math.round((removeProgress.done / removeProgress.total) * 100)
    : 0

  async function saveOpenAiSettings(clearApiKey = false) {
    setOpenAiSaving(true)
    setOpenAiMsg(null)
    try {
      const saved = await invoke<OpenAiSettingsView>('preferences:saveOpenAi', {
        baseUrl: openAiBaseUrl,
        apiKey: clearApiKey ? undefined : openAiApiKey,
        clearApiKey,
      })
      setOpenAi(saved)
      setOpenAiApiKey('')
      setOpenAiBaseUrl(saved.baseUrl)
      setOpenAiMsg(clearApiKey ? 'Saved — API key removed.' : 'Saved — OpenAI settings will be reused automatically.')
    } catch (e: unknown) {
      setOpenAiMsg((e as Error).message)
    } finally {
      setOpenAiSaving(false)
    }
  }

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

      <Section title="OpenAI">
        <p className="text-sm text-gray-500 mb-4">
          Persist an OpenAI-compatible base URL and API key for GUI classification runs. Saved locally in
          <code className="text-gray-400 ml-1">.preferences</code> with private file permissions.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Base URL</label>
            <input
              value={openAiBaseUrl}
              onChange={(e) => setOpenAiBaseUrl(e.target.value)}
              disabled={openAiSaving}
              placeholder="https://api.openai.com/v1"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-lavender/40 transition"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">API key</label>
            <input
              type="password"
              value={openAiApiKey}
              onChange={(e) => setOpenAiApiKey(e.target.value)}
              disabled={openAiSaving}
              placeholder={openAi?.hasApiKey ? 'Saved key present — enter a new one to replace it' : 'sk-...'}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-lavender/40 transition"
            />
            {openAi?.hasApiKey && (
              <p className="text-xs text-gray-600 mt-1">A saved API key is already present.</p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => saveOpenAiSettings(false)}
              disabled={openAiSaving}
              className="px-4 py-2 rounded text-sm bg-lavender/20 text-lavender hover:bg-lavender/30 disabled:opacity-40 transition-colors"
            >
              {openAiSaving ? 'Saving…' : 'Save OpenAI settings'}
            </button>
            <button
              onClick={() => saveOpenAiSettings(true)}
              disabled={openAiSaving || !openAi?.hasApiKey}
              className="px-4 py-2 rounded text-sm bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
            >
              Remove saved API key
            </button>
          </div>
          {openAiMsg && (
            <p className={`text-xs ${openAiMsg.startsWith('Saved') ? 'text-mint' : 'text-coral'}`}>{openAiMsg}</p>
          )}
        </div>
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

      {/* Diagnostics */}
      <Section title="Diagnostics">
        <p className="text-sm text-gray-500 mb-4">
          Validates all endpoints and local files the app depends on. Run this if sync, delete, or search stops working.
        </p>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={runHealth}
            disabled={healthRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] text-gray-300 text-sm hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
          >
            <Activity size={14} className={healthRunning ? 'animate-pulse' : ''} />
            {healthRunning ? 'Running…' : health ? 'Re-run checks' : 'Run health check'}
          </button>
          {health && (
            <span className={`text-xs ${health.critical ? 'text-coral' : 'text-mint'}`}>
              {health.critical ? '⚠ Issues found' : '✓ All checks passed'} · {new Date(health.ranAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        {health && (
          <div className="space-y-2 mb-4">
            {(['local', 'session', 'api'] as const).map(cat => {
              const catChecks = health.checks.filter(c => c.category === cat)
              if (!catChecks.length) return null
              const catLabel = cat === 'local' ? 'Local' : cat === 'session' ? 'Browser session' : 'X API endpoints'
              return (
                <div key={cat}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-700 mb-1.5 mt-3">{catLabel}</p>
                  {catChecks.map(check => (
                    <div key={check.id} className={`flex gap-3 p-3 rounded-lg border mb-1.5 ${
                      check.status === 'ok'    ? 'bg-mint/5 border-mint/15'    :
                      check.status === 'warn'  ? 'bg-amber/5 border-amber/15'  :
                      check.status === 'error' ? 'bg-coral/5 border-coral/20'  :
                                                 'bg-white/[0.02] border-white/[0.05]'
                    }`}>
                      <span className="mt-0.5 shrink-0 text-base leading-none">
                        {check.status === 'ok' ? '✓' : check.status === 'warn' ? '⚠' : check.status === 'error' ? '✗' : '–'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          check.status === 'ok' ? 'text-mint' : check.status === 'warn' ? 'text-amber' :
                          check.status === 'error' ? 'text-coral' : 'text-gray-600'
                        }`}>{check.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 break-all">{check.detail}</p>
                        {check.fix && <p className="text-xs text-gray-600 mt-1 italic">{check.fix}</p>}
                        {check.autofixable && (
                          <button
                            onClick={runAutofix}
                            disabled={autofixing}
                            className="flex items-center gap-1.5 mt-2 px-3 py-1 rounded text-xs bg-periwinkle/20 text-periwinkle hover:bg-periwinkle/30 disabled:opacity-40 transition-colors"
                          >
                            <Zap size={11} />
                            {autofixing ? 'Fetching new queryId from X bundle…' : 'Auto-update queryId'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {autofixResult && (
          <p className={`text-xs mt-1 ${autofixResult.startsWith('✓') ? 'text-mint' : 'text-coral'}`}>
            {autofixResult}
          </p>
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

      {/* Load snapshot */}
      <Section title="Load snapshot">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">Restore your library from a previous snapshot.</p>
          <button
            onClick={loadSnapshots}
            disabled={snapshotsLoading}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition-colors"
          >
            <RefreshCw size={11} className={snapshotsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {snapshots.length === 0 && !snapshotsLoading && (
          <p className="text-xs text-gray-600">No snapshots yet — take one above first.</p>
        )}

        <div className="space-y-2">
          {snapshots.map((s) => {
            const isConfirming = confirmRestore === s.snapshotPath
            const isRestoring  = restoring === s.snapshotPath
            const ts = new Date(s.timestamp)
            const dateStr = ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            const timeStr = ts.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={s.snapshotPath}
                className={`p-3 rounded-lg border transition-colors ${
                  isConfirming
                    ? 'bg-amber/5 border-amber/30'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs text-gray-300 font-medium">
                        {dateStr} {timeStr}
                      </span>
                      {s.label && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-lavender/15 text-lavender">
                          {s.label}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">
                      {s.recordCount.toLocaleString()} bookmarks
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isConfirming ? (
                      <>
                        <span className="text-xs text-amber">Overwrite current library?</span>
                        <button
                          onClick={async () => {
                            setRestoring(s.snapshotPath)
                            setConfirmRestore(null)
                            setRestoreResult(null)
                            setRestoreError(null)
                            try {
                              const r = await invoke<{ recordCount: number }>('bookmarks:restoreSnapshot', s.snapshotPath)
                              setRestoreResult({ path: s.snapshotPath, count: r.recordCount })
                              invoke<number>('bookmarks:count', {}).then(setTotal)
                            } catch (e: unknown) {
                              setRestoreError((e as Error).message)
                            } finally {
                              setRestoring(null)
                            }
                          }}
                          className="px-2.5 py-1 rounded text-xs bg-amber/20 text-amber hover:bg-amber/30 transition-colors"
                        >
                          Yes, restore
                        </button>
                        <button
                          onClick={() => setConfirmRestore(null)}
                          className="px-2.5 py-1 rounded text-xs bg-white/[0.06] text-gray-400 hover:bg-white/[0.1] transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmRestore(s.snapshotPath)}
                        disabled={isRestoring || !!restoring}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                      >
                        <RotateCcw size={11} />
                        {isRestoring ? 'Restoring…' : 'Restore'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {restoreResult && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-mint/10 border border-mint/20">
            <CheckCircle size={14} className="text-mint mt-0.5 shrink-0" />
            <p className="text-xs text-gray-200">
              Restored {restoreResult.count.toLocaleString()} bookmarks — library is up to date.
            </p>
          </div>
        )}
        {restoreError && (
          <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-coral/10 border border-coral/20">
            <AlertTriangle size={14} className="text-coral mt-0.5 shrink-0" />
            <p className="text-xs text-gray-300">{restoreError}</p>
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

      <Section title="Performance">
        <p className="text-sm text-gray-500 mb-4">
          Startup timings help explain slow launch and freezes. For deeper renderer profiling, open DevTools and record a Performance trace while reproducing the stall.
        </p>
        {startupMetrics.length > 0 ? (
          <div className="space-y-2 mb-4">
            {startupMetrics.map((metric) => (
              <div key={metric.name} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <span className="text-xs text-gray-400">{metric.name}</span>
                <span className="text-xs text-gray-300 font-mono">{metric.ms.toFixed(1)} ms</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-600 mb-4">No startup timings captured yet.</p>
        )}
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-gray-500 space-y-1">
          <p>For detailed startup logging, launch with <code className="text-gray-300">FT_GUI_PROFILE_STARTUP=1 pnpm gui:dev</code>.</p>
          <p>For freeze analysis, use DevTools → Performance in development builds and record while reproducing the stall.</p>
        </div>
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
