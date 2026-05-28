import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'

interface Stats {
  totalBookmarks: number
  uniqueAuthors: number
  dateRange: { earliest: string | null; latest: string | null }
  topAuthors: { handle: string; count: number }[]
  languageBreakdown: { language: string; count: number }[]
}

export function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    invoke<Stats>('stats:get').then(setStats).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-600 text-sm">Loading…</div>
  if (!stats) return <div className="p-8 text-gray-600 text-sm">No data.</div>

  const max = stats.topAuthors[0]?.count ?? 1

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-6">Stats</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Total" value={stats.totalBookmarks.toLocaleString()} />
        <Stat label="Voices" value={stats.uniqueAuthors.toLocaleString()} />
        <Stat label="Date range"
          value={stats.dateRange.earliest ? `${stats.dateRange.earliest?.slice(0,7)} – ${stats.dateRange.latest?.slice(0,7)}` : '—'} />
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">Top Authors</h2>
      <div className="space-y-2 mb-8">
        {stats.topAuthors.map((a) => (
          <div key={a.handle} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-32 truncate">@{a.handle}</span>
            <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-lavender/50 rounded-full"
                style={{ width: `${(a.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 w-8 text-right">{a.count}</span>
          </div>
        ))}
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">Languages</h2>
      <div className="flex flex-wrap gap-2">
        {stats.languageBreakdown.map((l) => (
          <span key={l.language} className="px-2 py-1 rounded bg-white/[0.05] text-xs text-gray-400">
            {l.language} <span className="text-gray-600">{l.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06]">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-200">{value}</p>
    </div>
  )
}
