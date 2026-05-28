import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'
import type { BookmarkStatusView, Screen } from '../app'

interface Props {
  onNav: (s: Screen) => void
}

export function DashboardScreen({ onNav }: Props) {
  const [status, setStatus] = useState<BookmarkStatusView | null>(null)
  const [categories, setCategories] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      invoke<BookmarkStatusView>('status:get'),
      invoke<Record<string, number>>('categories:counts'),
    ])
      .then(([s, c]) => {
        setStatus(s)
        setCategories(c)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (error) return <ErrorView message={error} />

  const total = status?.bookmarkCount ?? 0
  const catDone = status?.categoriesDone ?? 0
  const domDone = status?.domainsDone ?? 0
  const lastUpdated = status?.lastUpdated

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-100 mb-1">Field Theory</h1>
      <p className="text-sm text-gray-500 mb-8">Self-custody for your X/Twitter bookmarks</p>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Metric
          label="Bookmarks"
          value={total.toLocaleString()}
          sub={lastUpdated ? `Updated ${lastUpdated}` : 'Never synced'}
          accent="lavender"
          onClick={() => onNav('list')}
        />
        <Metric
          label="Classified"
          value={catDone.toLocaleString()}
          sub={`of ${total.toLocaleString()} total`}
          accent="periwinkle"
          onClick={() => onNav('classify')}
        />
        <Metric
          label="Domains"
          value={domDone.toLocaleString()}
          sub={`of ${total.toLocaleString()} total`}
          accent="mint"
          onClick={() => onNav('domains')}
        />
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">Quick actions</h2>
        <div className="flex gap-3">
          <ActionBtn label="Sync bookmarks" onClick={() => onNav('sync')} />
          <ActionBtn label="Browse library" onClick={() => onNav('list')} />
          <ActionBtn label="Run classify" onClick={() => onNav('classify')} />
          <ActionBtn label="Search" onClick={() => onNav('search')} />
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(categories).length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categories)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 12)
              .map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => onNav('categories')}
                  className="px-3 py-1 rounded-full text-xs bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
                >
                  {cat} <span className="text-gray-500">{count}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({
  label, value, sub, accent, onClick,
}: {
  label: string
  value: string
  sub: string
  accent: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-5 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold text-${accent} mb-1`}>{value}</p>
      <p className="text-xs text-gray-600">{sub}</p>
    </button>
  )
}

function ActionBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-md bg-white/[0.06] text-sm text-gray-300 hover:bg-white/[0.1] hover:text-gray-100 transition-colors"
    >
      {label}
    </button>
  )
}

function Loading() {
  return (
    <div className="p-8 text-gray-500 text-sm">Loading…</div>
  )
}

function ErrorView({ message }: { message: string }) {
  return (
    <div className="p-8">
      <p className="text-coral text-sm">{message}</p>
      <p className="text-gray-600 text-xs mt-2">Try running <code className="text-gray-400">ft sync</code> first.</p>
    </div>
  )
}
