import React, { useEffect, useState, useCallback } from 'react'
import { invoke, useIpcEvent } from '../hooks/useIpc'
import type {
  BookmarkTimelineItem,
  BookmarkTimelineFilters,
  DeleteDoneEvent,
  DeleteErrorEvent,
  DeleteProgressEvent,
} from '../../main/ipc-types'
import type { Screen } from '../app'
import { Search, Trash2, RotateCcw } from 'lucide-react'

interface Props {
  onNav: (s: Screen) => void
}

const PAGE_SIZE = 30

export function ListScreen({ onNav }: Props) {
  const [bookmarks, setBookmarks] = useState<BookmarkTimelineItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<BookmarkTimelineFilters>({ limit: PAGE_SIZE, offset: 0 })
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [actionMsg, setActionMsg] = useState('')
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [deleteRunning, setDeleteRunning] = useState(false)

  const load = useCallback(async (f: BookmarkTimelineFilters) => {
    setLoading(true)
    try {
      const [items, count] = await Promise.all([
        invoke<BookmarkTimelineItem[]>('bookmarks:list', f),
        invoke<number>('bookmarks:count', f),
      ])
      setBookmarks(items)
      setTotal(count)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filters)
  }, [filters, load])

  useIpcEvent('delete:progress', (p) => {
    const data = p as DeleteProgressEvent
    if (data.jobId === deleteJobId || (deleteJobId === null && deleteRunning)) {
      if (deleteJobId === null) setDeleteJobId(data.jobId)
      setActionMsg(`Removing ${data.done} / ${data.total} from X…`)
    }
  }, [deleteJobId, deleteRunning])

  useIpcEvent('delete:done', (p) => {
    const data = p as DeleteDoneEvent
    if (data.jobId === deleteJobId || (deleteJobId === null && deleteRunning)) {
      if (deleteJobId === null) setDeleteJobId(data.jobId)
      setDeleteRunning(false)
      setSelected(new Set())
      setActionMsg(`Removed ${data.deleted} from X${data.errors ? ` (${data.errors} failed)` : ''}`)
      setTimeout(() => setActionMsg(''), 4000)
    }
  }, [deleteJobId, deleteRunning])

  useIpcEvent('delete:error', (p) => {
    const data = p as DeleteErrorEvent
    if (data.jobId === deleteJobId || (deleteJobId === null && deleteRunning)) {
      if (deleteJobId === null) setDeleteJobId(data.jobId)
      setDeleteRunning(false)
      setActionMsg(data.error)
      setTimeout(() => setActionMsg(''), 4000)
    }
  }, [deleteJobId, deleteRunning])

  function goPage(p: number) {
    setPage(p)
    setFilters((f) => ({ ...f, offset: p * PAGE_SIZE }))
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === bookmarks.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(bookmarks.map((b) => b.id)))
    }
  }

  async function resetSelected() {
    if (!selected.size) return
    const ids = [...selected]
    await invoke('bookmarks:resetClassification', ids)
    setActionMsg(`Reset classification for ${ids.length} bookmark${ids.length > 1 ? 's' : ''}`)
    setSelected(new Set())
    await load(filters)
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function deleteFromX() {
    if (!selected.size) return
    const tweetIds = bookmarks
      .filter((b) => selected.has(b.id))
      .map((b) => b.tweetId)
    setDeleteRunning(true)
    setDeleteJobId(null)
    setActionMsg(`Starting removal for ${tweetIds.length} bookmark${tweetIds.length > 1 ? 's' : ''}…`)
    try {
      const result = await invoke<{ jobId: string }>('bookmarks:bulkDeleteFromX:start', { tweetIds })
      setDeleteJobId(result.jobId)
    } catch (e: unknown) {
      setDeleteRunning(false)
      setActionMsg((e as Error).message)
      setTimeout(() => setActionMsg(''), 4000)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06] bg-[#0f0f10] sticky top-0 z-10">
        <h1 className="text-sm font-semibold text-gray-300 mr-auto">
          Browse <span className="text-gray-600 font-normal ml-1">{total.toLocaleString()} bookmarks</span>
        </h1>
        {actionMsg && (
          <span className="text-xs text-mint">{actionMsg}</span>
        )}
        {selectMode && selected.size > 0 && (
          <>
            <button
              onClick={resetSelected}
              disabled={deleteRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-periwinkle/20 text-periwinkle hover:bg-periwinkle/30 disabled:opacity-40 transition-colors"
            >
              <RotateCcw size={12} /> Reset classification ({selected.size})
            </button>
            <button
              onClick={deleteFromX}
              disabled={deleteRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-coral/20 text-coral hover:bg-coral/30 disabled:opacity-40 transition-colors"
            >
              <Trash2 size={12} /> Remove from X ({selected.size})
            </button>
          </>
        )}
        <button
          onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }}
          disabled={deleteRunning}
          className={`px-3 py-1.5 rounded text-xs transition-colors ${selectMode ? 'bg-white/10 text-gray-200' : 'bg-white/[0.04] text-gray-500 hover:text-gray-300'}`}
        >
          {selectMode ? 'Cancel' : 'Select'}
        </button>
        <button
          onClick={() => onNav('search')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-white/[0.04] text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Search size={12} /> Search
        </button>
      </div>

      {/* Select-all bar */}
      {selectMode && (
        <div className="px-6 py-2 bg-white/[0.02] border-b border-white/[0.04] flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.size === bookmarks.length && bookmarks.length > 0}
            onChange={toggleAll}
            className="accent-lavender"
          />
          <span className="text-xs text-gray-500">
            {selected.size > 0 ? `${selected.size} selected` : 'Select all on page'}
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-gray-600 text-sm">Loading…</div>
        ) : bookmarks.length === 0 ? (
          <div className="p-6 text-gray-600 text-sm">No bookmarks found. Try running ft sync.</div>
        ) : (
          bookmarks.map((bm) => (
            <div
              key={bm.id}
              className={`flex gap-3 px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer ${
                selected.has(bm.id) ? 'bg-lavender/5' : ''
              }`}
              onClick={() => selectMode ? toggleSelect(bm.id) : onNav({ name: 'detail', id: bm.id })}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(bm.id)}
                  onChange={() => toggleSelect(bm.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 accent-lavender shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    @{bm.authorHandle ?? 'unknown'}
                  </span>
                  {bm.postedAt && (
                    <span className="text-xs text-gray-600 shrink-0">
                      {bm.postedAt.slice(0, 10)}
                    </span>
                  )}
                  {bm.primaryCategory && bm.primaryCategory !== 'unclassified' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-lavender/15 text-lavender shrink-0">
                      {bm.primaryCategory}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                  {bm.text}
                </p>
                {bm.articleTitle && (
                  <p className="text-xs text-periwinkle mt-1 truncate">{bm.articleTitle}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 px-6 py-3 border-t border-white/[0.06]">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page === 0}
            className="px-3 py-1 rounded text-xs bg-white/[0.04] text-gray-400 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-600">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 rounded text-xs bg-white/[0.04] text-gray-400 disabled:opacity-30 hover:bg-white/[0.08] transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
