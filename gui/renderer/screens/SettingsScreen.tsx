import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'
import { CheckCircle } from 'lucide-react'

export function SettingsScreen() {
  const [dataPath, setDataPath] = useState('')
  const [indexing, setIndexing] = useState(false)
  const [indexMsg, setIndexMsg] = useState('')

  useEffect(() => {
    invoke<string>('paths:data').then(setDataPath)
  }, [])

  async function rebuildIndex(force: boolean) {
    setIndexing(true)
    setIndexMsg('')
    try {
      const result = await invoke<{ recordCount: number; newRecords: number }>('index:build', { force })
      setIndexMsg(`Index rebuilt: ${result.recordCount.toLocaleString()} records`)
    } finally {
      setIndexing(false)
      setTimeout(() => setIndexMsg(''), 4000)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-lg font-semibold text-gray-200 mb-6">Settings</h1>

      <Section title="Data location">
        <p className="text-xs font-mono text-gray-400 break-all">{dataPath || '—'}</p>
      </Section>

      <Section title="Search index">
        <p className="text-sm text-gray-500 mb-4">Rebuild the SQLite search index from the JSONL cache.</p>
        <div className="flex gap-3">
          <button
            onClick={() => rebuildIndex(false)}
            disabled={indexing}
            className="px-4 py-2 rounded text-sm bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
          >
            Rebuild index
          </button>
          <button
            onClick={() => rebuildIndex(true)}
            disabled={indexing}
            className="px-4 py-2 rounded text-sm bg-coral/10 text-coral hover:bg-coral/20 disabled:opacity-40 transition-colors"
          >
            Force rebuild (drops all data)
          </button>
        </div>
        {indexMsg && (
          <div className="flex items-center gap-2 mt-3 text-xs text-mint">
            <CheckCircle size={12} /> {indexMsg}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">{title}</h2>
      {children}
    </div>
  )
}
