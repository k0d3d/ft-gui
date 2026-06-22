import React, { useState } from 'react'
import { ExternalLink, FolderOpen, Maximize2 } from 'lucide-react'
import type { BookmarkMediaView } from '../../main/ipc-types'
import { invoke } from '../hooks/useIpc'

interface Props {
  item: BookmarkMediaView
  showMeta?: boolean
}

function formatBytes(bytes?: number): string | null {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatFetchedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function mediaKind(item: BookmarkMediaView): string {
  if (item.contentType?.includes('video')) return 'Video'
  if (item.contentType?.includes('image')) return 'Image'
  return 'Media'
}

export function MediaPreviewCard({ item, showMeta = false }: Props) {
  const [error, setError] = useState('')
  const isVideo = item.contentType?.includes('video') || item.localPath.toLowerCase().endsWith('.mp4')
  const ref = { bookmarkId: item.bookmarkId, sourceUrl: item.sourceUrl }

  async function run(action: 'media:openLocal' | 'media:revealLocal' | 'media:openRemote') {
    setError('')
    try {
      await invoke<{ ok: true }>(action, ref)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.03]">
      <button
        type="button"
        onClick={() => run('media:openLocal')}
        className="block w-full bg-black text-left"
        title="Open local file"
      >
        {isVideo ? (
          <video
            src={item.displayUrl}
            className="w-full max-h-80 bg-black object-contain"
            muted
            playsInline
          />
        ) : (
          <img
            src={item.displayUrl}
            alt=""
            className="w-full max-h-80 object-contain bg-black"
            loading="lazy"
          />
        )}
      </button>

      <div className="space-y-2 p-2">
        {showMeta && (
          <div className="min-w-0 text-xs text-gray-500">
            <p className="truncate text-gray-300">
              {item.authorHandle ? `@${item.authorHandle}` : mediaKind(item)}
            </p>
            <p className="truncate">
              {formatFetchedAt(item.fetchedAt)}
              {formatBytes(item.bytes) ? ` · ${formatBytes(item.bytes)}` : ''}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => run('media:openLocal')}
            className="flex items-center gap-1.5 rounded bg-white/[0.06] px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.1]"
          >
            <Maximize2 size={12} /> Open
          </button>
          <button
            type="button"
            onClick={() => run('media:revealLocal')}
            className="flex items-center gap-1.5 rounded bg-white/[0.06] px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.1]"
          >
            <FolderOpen size={12} /> Reveal
          </button>
          <button
            type="button"
            onClick={() => run('media:openRemote')}
            className="flex items-center gap-1.5 rounded bg-white/[0.06] px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.1]"
          >
            <ExternalLink size={12} /> Source
          </button>
        </div>

        {error && <p className="break-words text-xs text-coral">{error}</p>}
      </div>
    </div>
  )
}
