import React, { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardScreen } from './screens/DashboardScreen'
import { ListScreen } from './screens/ListScreen'
import { SearchScreen } from './screens/SearchScreen'
import { SyncScreen } from './screens/SyncScreen'
import { ClassifyScreen } from './screens/ClassifyScreen'
import { StatsScreen } from './screens/StatsScreen'
import { VizScreen } from './screens/VizScreen'
import { CategoriesScreen } from './screens/CategoriesScreen'
import { DomainsScreen } from './screens/DomainsScreen'
import { FoldersScreen } from './screens/FoldersScreen'
import { MediaScreen } from './screens/MediaScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { BookmarkDetailScreen } from './screens/BookmarkDetailScreen'
import { nextMountedScreenNames, type BaseScreenName } from './screen-cache'

export type Screen =
  | 'dashboard'
  | 'list'
  | 'search'
  | 'sync'
  | 'classify'
  | 'stats'
  | 'viz'
  | 'categories'
  | 'domains'
  | 'folders'
  | 'media'
  | 'settings'
  | { name: 'detail'; id: string }

export function App() {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [mountedScreens, setMountedScreens] = useState<BaseScreenName[]>(['dashboard'])
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [healthWarning, setHealthWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!window.ftApi) return
    const handler = (data: unknown) => {
      const { version } = data as { version: string }
      setUpdateVersion(version)
    }
    const h = window.ftApi.on('app:update-ready', handler)
    return () => window.ftApi.off('app:update-ready', h)
  }, [])

  useEffect(() => {
    if (!window.ftApi) return
    const handler = (data: unknown) => {
      const report = data as { checks: { status: string; name: string }[] }
      const failed = report.checks.filter(c => c.status === 'error').map(c => c.name)
      if (failed.length) setHealthWarning(`Issue detected: ${failed.join(', ')} — check Settings → Diagnostics`)
    }
    const h = window.ftApi.on('health:critical', handler)
    return () => window.ftApi.off('health:critical', h)
  }, [])

  function nav(s: Screen) {
    setScreen(s)
    setMountedScreens((current) => nextMountedScreenNames(current, s))
  }

  const currentName = typeof screen === 'string' ? screen : screen.name

  function renderBaseScreen(name: BaseScreenName) {
    switch (name) {
      case 'dashboard':   return <DashboardScreen onNav={nav} />
      case 'list':        return <ListScreen onNav={nav} />
      case 'search':      return <SearchScreen onNav={nav} />
      case 'sync':        return <SyncScreen />
      case 'classify':    return <ClassifyScreen />
      case 'stats':       return <StatsScreen />
      case 'viz':         return <VizScreen />
      case 'categories':  return <CategoriesScreen />
      case 'domains':     return <DomainsScreen />
      case 'folders':     return <FoldersScreen />
      case 'media':       return <MediaScreen />
      case 'settings':    return <SettingsScreen />
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {healthWarning && (
        <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-coral/10 border-b border-coral/20 text-xs text-coral">
          ⚠ {healthWarning}
          <button onClick={() => { nav('settings'); setHealthWarning(null) }} className="underline hover:no-underline ml-1">Open</button>
          <button onClick={() => setHealthWarning(null)} className="text-coral/50 hover:text-coral ml-1">✕</button>
        </div>
      )}
      {updateVersion && (
        <div className="flex items-center justify-center gap-3 px-4 py-1.5 bg-mint/10 border-b border-mint/20 text-xs text-mint">
          v{updateVersion} is ready — restart to update
          <button
            onClick={() => setUpdateVersion(null)}
            className="text-mint/50 hover:text-mint ml-2"
          >✕</button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar current={currentName} onNav={(s) => nav(s as Screen)} />
        <main className="flex-1 overflow-y-auto">
          {mountedScreens.map((name) => (
            <div key={name} className={currentName === name ? 'block h-full' : 'hidden h-full'}>
              {renderBaseScreen(name)}
            </div>
          ))}
          {typeof screen === 'object' && screen.name === 'detail' && (
            <BookmarkDetailScreen id={screen.id} onBack={() => setScreen('list')} />
          )}
        </main>
      </div>
    </div>
  )
}
