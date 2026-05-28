import React from 'react'
import {
  LayoutDashboard,
  List,
  Search,
  RefreshCw,
  Tag,
  BarChart2,
  Activity,
  Layers,
  Globe,
  Folder,
  Image,
  Settings,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  group?: string
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} />, group: 'Bookmarks' },
  { id: 'list',      label: 'Browse',    icon: <List size={16} />,            group: 'Bookmarks' },
  { id: 'search',    label: 'Search',    icon: <Search size={16} />,          group: 'Bookmarks' },
  { id: 'sync',      label: 'Sync',      icon: <RefreshCw size={16} />,       group: 'Bookmarks' },

  { id: 'classify',   label: 'Classify',   icon: <Tag size={16} />,     group: 'Classify' },
  { id: 'categories', label: 'Categories', icon: <Layers size={16} />,  group: 'Classify' },
  { id: 'domains',    label: 'Domains',    icon: <Globe size={16} />,   group: 'Classify' },
  { id: 'folders',    label: 'Folders',    icon: <Folder size={16} />,  group: 'Classify' },

  { id: 'viz',   label: 'Viz',   icon: <Activity size={16} />,  group: 'Explore' },
  { id: 'stats', label: 'Stats', icon: <BarChart2 size={16} />, group: 'Explore' },

  { id: 'media',    label: 'Media',    icon: <Image size={16} />,    group: 'Tools' },
  { id: 'settings', label: 'Settings', icon: <Settings size={16} />, group: 'Tools' },
]

interface Props {
  current: string
  onNav: (screen: string) => void
}

export function Sidebar({ current, onNav }: Props) {
  const groups = [...new Set(NAV.map((n) => n.group!))]

  return (
    <aside
      className="flex flex-col shrink-0 border-r border-white/[0.06] bg-[#0a0a0b]"
      style={{ width: 200 }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <span className="text-sm font-semibold tracking-wide text-lavender">
          Field Theory
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {groups.map((group) => (
          <div key={group} className="mb-1">
            <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              {group}
            </p>
            {NAV.filter((n) => n.group === group).map((item) => (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                className={[
                  'flex w-full items-center gap-2.5 px-4 py-1.5 text-sm transition-colors',
                  current === item.id
                    ? 'text-lavender bg-white/[0.06]'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.03]',
                ].join(' ')}
              >
                <span className={current === item.id ? 'text-lavender' : 'text-gray-600'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
