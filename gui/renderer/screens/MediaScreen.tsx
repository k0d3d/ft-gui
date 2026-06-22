import React, { useEffect, useState } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import { Image, CheckCircle, XCircle } from 'lucide-react'
import type { RecentMediaView } from '../../main/ipc-types'
import { MediaPreviewCard } from '../components/MediaPreviewCard'

export function MediaScreen() {
  const [running, setRunning] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number; downloaded: number } | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState('')
  const [recentMedia, setRecentMedia] = useState<RecentMediaView[]>([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [galleryError, setGalleryError] = useState<string | null>(null)

  async function loadRecentMedia() {
    setGalleryLoading(true)
    setGalleryError(null)
    try {
      const media = await invoke<RecentMediaView[]>('media:recent', { limit: 24 })
      setRecentMedia(media)
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : String(err))
    } finally {
      setGalleryLoading(false)
    }
  }

  useEffect(() => {
    loadRecentMedia()
  }, [])

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
      loadRecentMedia()
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
    <div className="p-8 max-w-5xl">
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

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Recent downloads</h2>
            <p className="text-xs text-gray-600">Newest local post media from the manifest.</p>
          </div>
          <button
            type="button"
            onClick={loadRecentMedia}
            disabled={galleryLoading}
            className="rounded bg-white/[0.06] px-3 py-2 text-xs text-gray-300 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            Refresh
          </button>
        </div>

        {galleryLoading && (
          <p className="text-sm text-gray-600">Loading media...</p>
        )}

        {galleryError && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-coral/10 border border-coral/20">
            <XCircle size={18} className="text-coral mt-0.5" />
            <p className="text-sm text-gray-300">{galleryError}</p>
          </div>
        )}

        {!galleryLoading && !galleryError && recentMedia.length === 0 && (
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-5 text-sm text-gray-500">
            No downloaded media yet.
          </div>
        )}

        {recentMedia.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentMedia.map((item) => (
              <MediaPreviewCard key={`${item.bookmarkId}-${item.sourceUrl}`} item={item} showMeta />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
