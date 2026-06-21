import React, { useState, useRef } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import type { BookmarkTimelineItem, MediaProgressEvent, SearchResult } from '../../main/ipc-types'
import type { Screen } from '../app'
import { Download, Image, Search } from 'lucide-react'
import { formatBookmarkDate } from '../date-format'
import { downloadBookmarkJson } from '../bookmark-export'

interface Props {
  onNav: (s: Screen) => void
}

export function SearchScreen({ onNav }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [mediaJobId, setMediaJobId] = useState<string | null>(null)
  const [mediaRunning, setMediaRunning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useIpcEvent('media:progress', (p) => {
    const data = p as MediaProgressEvent
    if (data.jobId === mediaJobId || (mediaJobId === null && mediaRunning)) {
      if (mediaJobId === null) setMediaJobId(data.jobId)
      setActionMsg(`Fetching media… ${data.downloaded} downloaded`)
    }
  }, [mediaJobId, mediaRunning])

  useIpcEvent('media:done', (p) => {
    const data = p as { jobId: string; downloaded: number; failed: number }
    if (data.jobId === mediaJobId || (mediaJobId === null && mediaRunning)) {
      if (mediaJobId === null) setMediaJobId(data.jobId)
      setMediaRunning(false)
      setActionMsg(`Fetched ${data.downloaded} media asset${data.downloaded === 1 ? '' : 's'}${data.failed ? ` (${data.failed} failed)` : ''}`)
      setTimeout(() => setActionMsg(''), 4000)
    }
  }, [mediaJobId, mediaRunning])

  useIpcEvent('media:error', (p) => {
    const data = p as { jobId: string; error: string }
    if (data.jobId === mediaJobId || (mediaJobId === null && mediaRunning)) {
      if (mediaJobId === null) setMediaJobId(data.jobId)
      setMediaRunning(false)
      setActionMsg(data.error)
      setTimeout(() => setActionMsg(''), 4000)
    }
  }, [mediaJobId, mediaRunning])

  async function runSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await invoke<SearchResult[]>('bookmarks:search', { query: q, limit: 50 })
      setResults(res)
      setSelected(new Set())
      setSelectMode(false)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') runSearch(query)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map((r) => r.id)))
    }
  }

  async function exportSelected() {
    if (!selected.size) return
    const selectedResults = results.filter((r) => selected.has(r.id))
    const fullBookmarks = await Promise.all(
      selectedResults.map((r) => invoke<BookmarkTimelineItem | null>('bookmarks:get', r.id)),
    )
    const exportItems = fullBookmarks.map((bm, index) => bm ?? selectedResults[index])
    downloadBookmarkJson(exportItems)
    setActionMsg(`Exported ${exportItems.length} bookmark${exportItems.length > 1 ? 's' : ''}`)
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function fetchSelectedMedia() {
    if (!selected.size) return
    const bookmarkIds = results.filter((r) => selected.has(r.id)).map((r) => r.id)
    setMediaRunning(true)
    setMediaJobId(null)
    setActionMsg(`Starting media fetch for ${bookmarkIds.length} bookmark${bookmarkIds.length > 1 ? 's' : ''}…`)
    try {
      const result = await invoke<{ jobId: string }>('media:fetch:start', {
        bookmarkIds,
        skipProfileImages: true,
      })
      setMediaJobId(result.jobId)
    } catch (e: unknown) {
      setMediaRunning(false)
      setActionMsg((e as Error).message)
      setTimeout(() => setActionMsg(''), 4000)
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-sm font-semibold text-gray-400 mr-auto">Search bookmarks</h1>
        {actionMsg && <span className="text-xs text-mint">{actionMsg}</span>}
        {selectMode && selected.size > 0 && (
          <>
            <button
              onClick={exportSelected}
              disabled={mediaRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-mint/15 text-mint hover:bg-mint/25 disabled:opacity-40 transition-colors"
            >
              <Download size={12} /> Export JSON ({selected.size})
            </button>
            <button
              onClick={fetchSelectedMedia}
              disabled={mediaRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-peach/15 text-peach hover:bg-peach/25 disabled:opacity-40 transition-colors"
            >
              <Image size={12} /> {mediaRunning ? 'Fetching media…' : `Fetch media (${selected.size})`}
            </button>
          </>
        )}
        {results.length > 0 && (
          <button
            onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }}
            disabled={mediaRunning}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${selectMode ? 'bg-white/10 text-gray-200' : 'bg-white/[0.04] text-gray-500 hover:text-gray-300'}`}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search bookmarks…"
            autoFocus
            className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-lavender/40 focus:ring-1 focus:ring-lavender/20 transition"
          />
        </div>
        <button
          onClick={() => runSearch(query)}
          className="px-4 py-2.5 rounded-lg bg-lavender/20 text-lavender text-sm hover:bg-lavender/30 transition-colors"
        >
          Search
        </button>
      </div>

      {/* Results */}
      {loading && <p className="text-gray-600 text-sm">Searching…</p>}

      {!loading && searched && results.length === 0 && (
        <p className="text-gray-600 text-sm">No results for "{query}"</p>
      )}

      {!loading && results.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            {selectMode && (
              <input
                type="checkbox"
                checked={selected.size === results.length && results.length > 0}
                onChange={toggleAll}
                className="accent-lavender"
              />
            )}
            <p className="text-xs text-gray-600">
              {selectMode && selected.size > 0
                ? `${selected.size} selected`
                : `${results.length} result${results.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="space-y-px">
            {results.map((r) => (
              <div
                key={r.id}
                onClick={() => selectMode ? toggleSelect(r.id) : onNav({ name: 'detail', id: r.id })}
                className={`w-full text-left px-4 py-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors cursor-pointer ${
                  selected.has(r.id) ? 'bg-lavender/5' : ''
                }`}
              >
                <div className="flex gap-3">
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 accent-lavender shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-200">
                        @{r.authorHandle ?? 'unknown'}
                      </span>
                      {r.postedAt && (
                        <span className="text-xs text-gray-600">{formatBookmarkDate(r.postedAt)}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{r.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!searched && (
        <p className="text-gray-700 text-sm">
          Full-text search across all bookmark text, authors, and article content.
        </p>
      )}
    </div>
  )
}
