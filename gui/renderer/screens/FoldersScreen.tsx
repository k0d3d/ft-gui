import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'

export function FoldersScreen() {
  const [data, setData] = useState<{ counts: Record<string, number>; untagged: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<{ counts: Record<string, number>; untagged: number }>('folders:counts')
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-600 text-sm">Loading…</div>
  if (!data) return null

  const entries = Object.entries(data.counts).sort((a, b) => b[1] - a[1])
  const max = Math.max(...entries.map((e) => e[1]), data.untagged, 1)

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-6">Folders</h1>
      <div className="space-y-3">
        {entries.map(([folder, count]) => (
          <div key={folder} className="flex items-center gap-3">
            <span className="text-sm text-gray-300 w-40 truncate">{folder}</span>
            <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-amber/50 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-600 w-10 text-right">{count}</span>
          </div>
        ))}
        {data.untagged > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-40">unfiled</span>
            <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full bg-gray-600/50 rounded-full" style={{ width: `${(data.untagged / max) * 100}%` }} />
            </div>
            <span className="text-xs text-gray-600 w-10 text-right">{data.untagged}</span>
          </div>
        )}
      </div>
    </div>
  )
}
