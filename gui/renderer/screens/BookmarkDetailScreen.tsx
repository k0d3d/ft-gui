import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'
import type { BookmarkTimelineItem } from '../../main/ipc-types'
import { ArrowLeft, ExternalLink, RotateCcw } from 'lucide-react'
import { formatBookmarkDate } from '../date-format'

interface Props {
  id: string
  onBack: () => void
}

export function BookmarkDetailScreen({ id, onBack }: Props) {
  const [bm, setBm] = useState<BookmarkTimelineItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetMsg, setResetMsg] = useState('')

  useEffect(() => {
    invoke<BookmarkTimelineItem | null>('bookmarks:get', id)
      .then(setBm)
      .finally(() => setLoading(false))
  }, [id])

  async function resetClassification() {
    if (!bm) return
    await invoke('bookmarks:resetClassification', [bm.id])
    setBm({ ...bm, primaryCategory: 'unclassified', categories: [], domains: [], primaryDomain: null })
    setResetMsg('Classification reset.')
    setTimeout(() => setResetMsg(''), 3000)
  }

  if (loading) return <div className="p-8 text-gray-600 text-sm">Loading…</div>
  if (!bm) return <div className="p-8 text-gray-600 text-sm">Bookmark not found.</div>

  return (
    <div className="p-6 max-w-2xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-300 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-1">
          @{bm.authorHandle ?? 'unknown'} · {formatBookmarkDate(bm.postedAt)}
        </p>
        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{bm.text}</p>
      </div>

      {bm.articleTitle && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <p className="text-sm font-medium text-periwinkle mb-1">{bm.articleTitle}</p>
          {bm.articleSite && <p className="text-xs text-gray-600">{bm.articleSite}</p>}
          {bm.articleText && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-4">{bm.articleText}</p>
          )}
        </div>
      )}

      {bm.quotedTweet && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
          <p className="text-xs text-gray-600 mb-1">↩ @{bm.quotedTweet.authorHandle}</p>
          <p className="text-xs text-gray-400">{bm.quotedTweet.text}</p>
        </div>
      )}

      {/* Categories & domains */}
      <div className="flex flex-wrap gap-2 mb-6">
        {bm.primaryCategory && bm.primaryCategory !== 'unclassified' && (
          <span className="text-xs px-2 py-1 rounded bg-lavender/15 text-lavender">{bm.primaryCategory}</span>
        )}
        {bm.primaryDomain && (
          <span className="text-xs px-2 py-1 rounded bg-periwinkle/15 text-periwinkle">{bm.primaryDomain}</span>
        )}
        {bm.folderNames.map((f) => (
          <span key={f} className="text-xs px-2 py-1 rounded bg-white/[0.06] text-gray-400">{f}</span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <a
          href={bm.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
        >
          <ExternalLink size={12} /> Open on X
        </a>
        <button
          onClick={resetClassification}
          className="flex items-center gap-1.5 px-3 py-2 rounded text-xs bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
        >
          <RotateCcw size={12} /> Reset classification
        </button>
      </div>

      {resetMsg && <p className="text-xs text-mint mt-3">{resetMsg}</p>}

      {/* Meta */}
      <div className="mt-6 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-3 text-xs text-gray-600">
        {bm.likeCount != null && <span>♥ {bm.likeCount?.toLocaleString()}</span>}
        {bm.repostCount != null && <span>↻ {bm.repostCount?.toLocaleString()}</span>}
        {bm.viewCount != null && <span>👁 {bm.viewCount?.toLocaleString()}</span>}
      </div>
    </div>
  )
}
