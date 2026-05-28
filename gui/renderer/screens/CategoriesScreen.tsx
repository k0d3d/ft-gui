import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'

export function CategoriesScreen() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<Record<string, number>>('categories:counts').then(setCounts).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-600 text-sm">Loading…</div>

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const max = entries[0]?.[1] ?? 1

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-6">Categories</h1>
      {entries.length === 0 ? (
        <p className="text-gray-600 text-sm">No categories yet. Run classify first.</p>
      ) : (
        <div className="space-y-3">
          {entries.map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-sm text-gray-300 w-36 truncate">{cat}</span>
              <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-lavender/50 rounded-full transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 w-10 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
