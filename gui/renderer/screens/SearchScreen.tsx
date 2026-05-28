import React, { useState, useRef } from 'react'
import { invoke } from '../hooks/useIpc'
import type { SearchResult } from '../../main/ipc-types'
import type { Screen } from '../app'
import { Search } from 'lucide-react'

interface Props {
  onNav: (s: Screen) => void
}

export function SearchScreen({ onNav }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function runSearch(q: string) {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await invoke<SearchResult[]>('bookmarks:search', { query: q, limit: 50 })
      setResults(res)
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') runSearch(query)
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-sm font-semibold text-gray-400 mb-4">Search bookmarks</h1>

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
          <p className="text-xs text-gray-600 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          <div className="space-y-px">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => onNav({ name: 'detail', id: r.id })}
                className="w-full text-left px-4 py-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] transition-colors"
              >
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-200">
                    @{r.authorHandle ?? 'unknown'}
                  </span>
                  {r.postedAt && (
                    <span className="text-xs text-gray-600">{r.postedAt.slice(0, 10)}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">{r.text}</p>
              </button>
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
