import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { createRequire } from 'module'
import { registerIpcHandlers } from './ipc-handlers.js'
import { markStartup } from './performance.js'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json') as { version: string }

markStartup('main:module-loaded')

// Auto-updater — only active in packaged builds
async function runStartupHealthCheck(win: BrowserWindow) {
  try {
    markStartup('health-check:start')
    const { runHealthChecks } = await import('../../src/health-check.js')
    const report = await runHealthChecks()
    markStartup('health-check:done')
    if (report.critical) {
      // Delay slightly so the renderer has time to mount
      setTimeout(() => {
        win.webContents.send('health:critical', report)
      }, 2500)
    }
  } catch {
    // health check failure is never fatal to app startup
  }
}

async function setupAutoUpdater(win: BrowserWindow) {
  if (!app.isPackaged) return
  try {
    markStartup('auto-updater:start')
    const { autoUpdater } = await import('electron-updater')
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('update-downloaded', (info) => {
      win.webContents.send('app:update-ready', { version: info.version })
    })
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
    markStartup('auto-updater:armed')
  } catch {
    // not available outside packaged app
  }
}

function createWindow(): BrowserWindow {
  markStartup('window:create:start')
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'FT GUI',
    backgroundColor: '#0f0f10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  registerIpcHandlers(win)
  markStartup('window:create:ready')

  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.error('[renderer]', message)
    else console.log('[renderer]', message)
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[load-failed]', code, desc, url)
  })

  win.webContents.on('dom-ready', () => {
    markStartup('renderer:dom-ready')
  })

  win.webContents.on('did-finish-load', () => {
    markStartup('renderer:did-finish-load')
  })

  // Open external links in the system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    markStartup('window:load-url')
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    markStartup('window:load-file')
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Open DevTools in dev builds for debugging
  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    markStartup('app:ready')
    const win = createWindow()
    setTimeout(() => {
      setupAutoUpdater(win)
      runStartupHealthCheck(win)
    }, 2500)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
