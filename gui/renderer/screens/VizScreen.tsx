import React, { useEffect, useState } from 'react'
import { invoke } from '../hooks/useIpc'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  Cell,
} from 'recharts'

// ── Types (mirror of src/bookmarks-viz.ts) ───────────────────────────────

interface GemBookmark {
  author: string
  text: string
  tweetId: string
  postedAt: string
}

interface VizData {
  total: number
  uniqueAuthors: number
  dateRange: { earliest: string; latest: string }
  topAuthors: { handle: string; count: number }[]
  monthlyActivity: { month: string; count: number }[]
  dayOfWeekActivity: { day: string; count: number }[]
  hourActivity: { hour: number; count: number }[]
  topDomains: { domain: string; count: number }[]
  mediaStats: { withMedia: number; withLinks: number; total: number }
  recentAuthors: { handle: string; count: number }[]
  languages: { lang: string; count: number }[]
  avgTextLength: number
  timeCapsules: GemBookmark[]
  hiddenGems: GemBookmark[]
  risingVoices: { handle: string; count: number }[]
  categories: { name: string; count: number }[]
  domains: { name: string; count: number }[]
}

// ── Palette ───────────────────────────────────────────────────────────────

const LAVENDER = '#c4b5fd'
const PERIWINKLE = '#a5b4fc'
const MINT = '#6ee7b7'
const PEACH = '#fdba74'
const CORAL = '#fca5a5'
const AMBER = '#fcd34d'
const MUTED = '#4b5563'

// ── Helpers ───────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-4">
      {children}
    </h2>
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="mb-10">{children}</div>
}

const TOOLTIP_STYLE = {
  backgroundColor: '#1a1a1c',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 6,
  color: '#d1d5db',
  fontSize: 11,
}

// ── VizScreen ─────────────────────────────────────────────────────────────

export function VizScreen() {
  const [data, setData] = useState<VizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    invoke<VizData>('viz:getData')
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-gray-600 text-sm">Crunching data…</div>
  if (error) return <div className="p-8 text-coral text-sm">{error}</div>
  if (!data) return null

  const mediaMediaPct = data.mediaStats.total > 0
    ? Math.round((data.mediaStats.withMedia / data.mediaStats.total) * 100)
    : 0
  const linksPct = data.mediaStats.total > 0
    ? Math.round((data.mediaStats.withLinks / data.mediaStats.total) * 100)
    : 0

  return (
    <div className="p-8 max-w-5xl">
      {/* ── Header metrics ───────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-10">
        <Metric label="Bookmarks" value={data.total.toLocaleString()} color={LAVENDER} />
        <Metric label="Voices" value={data.uniqueAuthors.toLocaleString()} color={PERIWINKLE} />
        <Metric label="Avg length" value={`${data.avgTextLength} chars`} color={MINT} />
        <Metric
          label="Date range"
          value={`${data.dateRange.earliest?.slice(0, 7) ?? '?'} – ${data.dateRange.latest?.slice(0, 7) ?? '?'}`}
          color={PEACH}
        />
      </div>

      {/* ── Publication rhythm ───────────────────────────────────────── */}
      {data.monthlyActivity.length > 0 && (
        <Section>
          <SectionTitle>Publication rhythm</SectionTitle>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.monthlyActivity} margin={{ top: 4, right: 8, bottom: 0, left: -24 }}>
              <defs>
                <linearGradient id="grad-monthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={LAVENDER} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={LAVENDER} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fill: MUTED, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(v: string) => v.slice(0, 7)}
              />
              <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [v, 'bookmarks']}
                labelFormatter={(l: string) => l.slice(0, 7)}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke={LAVENDER}
                strokeWidth={1.5}
                fill="url(#grad-monthly)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Section>
      )}

      <div className="grid grid-cols-2 gap-8 mb-10">
        {/* ── Day of week ───────────────────────────────────────────── */}
        {data.dayOfWeekActivity.length > 0 && (
          <div>
            <SectionTitle>Post weekdays</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={data.dayOfWeekActivity} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="day" tick={{ fill: MUTED, fontSize: 10 }} />
                <Radar dataKey="count" stroke={PERIWINKLE} fill={PERIWINKLE} fillOpacity={0.15} strokeWidth={1.5} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Hour of day ───────────────────────────────────────────── */}
        {data.hourActivity.length > 0 && (
          <div>
            <SectionTitle>Posting hours (UTC)</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={data.hourActivity}
                margin={{ top: 4, right: 0, bottom: 0, left: -24 }}
                barSize={6}
              >
                <XAxis
                  dataKey="hour"
                  tick={{ fill: MUTED, fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  interval={3}
                  tickFormatter={(h: number) => `${h}h`}
                />
                <YAxis tick={{ fill: MUTED, fontSize: 9 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v: number) => [v, 'bookmarks']}
                  labelFormatter={(h: number) => `${h}:00 UTC`}
                />
                <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                  {data.hourActivity.map((_, i) => (
                    <Cell key={i} fill={i % 6 === 0 ? LAVENDER : `${LAVENDER}80`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Who you listen to ───────────────────────────────────────── */}
      {data.topAuthors.length > 0 && (
        <Section>
          <SectionTitle>Who you listen to</SectionTitle>
          <ResponsiveContainer width="100%" height={Math.min(data.topAuthors.length, 20) * 26 + 8}>
            <BarChart
              data={data.topAuthors.slice(0, 20)}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
              barSize={12}
            >
              <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="handle"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={110}
                tickFormatter={(h: string) => `@${h}`}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v: number) => [v, 'bookmarks']}
                labelFormatter={(h: string) => `@${h}`}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {data.topAuthors.slice(0, 20).map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === 0 ? LAVENDER : i < 3 ? PERIWINKLE : `${PERIWINKLE}70`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── Where links lead ────────────────────────────────────────── */}
      {data.topDomains.length > 0 && (
        <Section>
          <SectionTitle>Where links lead</SectionTitle>
          <ResponsiveContainer width="100%" height={Math.min(data.topDomains.length, 15) * 26 + 8}>
            <BarChart
              data={data.topDomains.slice(0, 15)}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}
              barSize={10}
            >
              <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="domain"
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, 'links']} />
              <Bar dataKey="count" fill={MINT} fillOpacity={0.7} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      <div className="grid grid-cols-2 gap-8 mb-10">
        {/* ── Categories ───────────────────────────────────────────── */}
        {data.categories.length > 0 && (
          <div>
            <SectionTitle>Categories</SectionTitle>
            <div className="space-y-2">
              {data.categories.map((c) => (
                <HBar
                  key={c.name}
                  label={c.name}
                  count={c.count}
                  max={data.categories[0].count}
                  color={LAVENDER}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Subject domains ──────────────────────────────────────── */}
        {data.domains.length > 0 && (
          <div>
            <SectionTitle>Subject domains</SectionTitle>
            <div className="space-y-2">
              {data.domains.map((d) => (
                <HBar
                  key={d.name}
                  label={d.name}
                  count={d.count}
                  max={data.domains[0].count}
                  color={PERIWINKLE}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Composition ─────────────────────────────────────────────── */}
      <Section>
        <SectionTitle>Composition</SectionTitle>
        <div className="grid grid-cols-3 gap-4">
          <CompStat label="With media" value={`${mediaMediaPct}%`} color={PEACH} />
          <CompStat label="With links" value={`${linksPct}%`} color={MINT} />
          <CompStat label="Text only" value={`${100 - mediaMediaPct - linksPct < 0 ? 0 : 100 - mediaMediaPct - linksPct}%`} color={MUTED} />
        </div>
      </Section>

      {/* ── Time capsules ────────────────────────────────────────────── */}
      {data.timeCapsules.length > 0 && (
        <Section>
          <SectionTitle>Time capsules</SectionTitle>
          <div className="space-y-3">
            {data.timeCapsules.map((g) => (
              <GemCard key={g.tweetId} gem={g} accentColor={AMBER} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Hidden gems ──────────────────────────────────────────────── */}
      {data.hiddenGems.length > 0 && (
        <Section>
          <SectionTitle>Hidden gems</SectionTitle>
          <div className="space-y-3">
            {data.hiddenGems.map((g) => (
              <GemCard key={g.tweetId} gem={g} accentColor={CORAL} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Rising voices ─────────────────────────────────────────────── */}
      {data.risingVoices.length > 0 && (
        <Section>
          <SectionTitle>Rising voices</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {data.risingVoices.map((v) => (
              <span
                key={v.handle}
                className="px-3 py-1 rounded-full text-xs bg-white/[0.05] text-gray-300"
              >
                @{v.handle}
                <span className="text-gray-600 ml-1">{v.count}</span>
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* ── Languages ──────────────────────────────────────────────────── */}
      {data.languages.length > 1 && (
        <Section>
          <SectionTitle>Languages</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {data.languages.map((l) => (
              <span key={l.lang} className="px-2 py-1 rounded bg-white/[0.05] text-xs text-gray-400">
                {l.lang} <span className="text-gray-600">{l.count}</span>
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-4 rounded-lg bg-white/[0.04] border border-white/[0.06]">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className="text-lg font-bold truncate" style={{ color }}>{value}</p>
    </div>
  )
}

function HBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-28 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(count / max) * 100}%`, backgroundColor: color, opacity: 0.6 }}
        />
      </div>
      <span className="text-xs text-gray-600 w-8 text-right">{count}</span>
    </div>
  )
}

function CompStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
      <p className="text-2xl font-bold mb-1" style={{ color }}>{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
    </div>
  )
}

function GemCard({ gem, accentColor }: { gem: GemBookmark; accentColor: string }) {
  return (
    <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-xs font-medium" style={{ color: accentColor }}>@{gem.author}</span>
        <span className="text-xs text-gray-700">{gem.postedAt?.slice(0, 10)}</span>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{gem.text}</p>
    </div>
  )
}
