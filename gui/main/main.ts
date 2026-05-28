import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { createRequire } from 'module'
import { registerIpcHandlers } from './ipc-handlers.js'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json') as { version: string }

// Auto-updater — only active in packaged builds
async function setupAutoUpdater(win: BrowserWindow) {
  if (!app.isPackaged) return
  try {
    const { autoUpdater } = await import('electron-updater')
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('update-downloaded', (info) => {
      win.webContents.send('app:update-ready', { version: info.version })
    })
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  } catch {
    // not available outside packaged app
  }
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: `FT GUI v${version}`,
    backgroundColor: '#0f0f10',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  registerIpcHandlers(win)

  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) console.error('[renderer]', message)
    else console.log('[renderer]', message)
  })

  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error('[load-failed]', code, desc, url)
  })

  // Open external links in the system browser, not in Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
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
    const win = createWindow()
    setupAutoUpdater(win)

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
