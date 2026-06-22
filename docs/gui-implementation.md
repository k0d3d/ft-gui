# FT GUI — Implementation Report

**Date:** 2026-05-28  
**Version:** 2.0.0  
**Branch:** master  
**Base commit:** ffd0233 (fieldtheory-cli by @afar1)

---

## Overview

This report covers the addition of an Electron desktop GUI to the Field Theory CLI. The CLI remains fully intact and functional (`ft` command, `npm run build`, etc.). The GUI is a separate build target that shares the same data layer.

The GUI is named **FT GUI**. It is built on top of [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1).

---

## What Was Built

### New npm scripts

| Script | Description |
|---|---|
| `pnpm gui:dev` | Dev mode with hot-reload (Vite dev server + Electron) |
| `pnpm gui:build` | Production build → `dist-gui/` |
| `pnpm gui:start` | Launch the built app |
| `pnpm gui:pack` | Build + package for Linux (AppImage + deb) → `release/` |
| `pnpm gui:pack:all` | Build + package for Linux, macOS, and Windows |

### New files

#### Build & config
| File | Purpose |
|---|---|
| `electron.vite.config.ts` | electron-vite build config (main, preload, renderer); injects `__APP_VERSION__` into renderer |
| `tsconfig.gui.json` | TypeScript config for `gui/` (bundler resolution, JSX) |
| `tailwind.config.js` | Tailwind CSS with FT colour palette (lavender, periwinkle, mint, peach, coral, amber) |
| `postcss.config.js` | PostCSS config for Tailwind |

#### Icons and assets
| File | Purpose |
|---|---|
| `assets/images/icon-1024.png` | Source icon (1024×1024 PNG) |
| `assets/images/icon.svg` | SVG source |
| `build/icons/` | Generated sizes: 16, 32, 48, 64, 128, 256, 512, 1024 px PNGs + `icon.ico` (multi-res Windows) |

#### Electron main process (`gui/main/`)
| File | Purpose |
|---|---|
| `main.ts` | BrowserWindow lifecycle, single-instance lock, auto-updater, DevTools in dev mode |
| `preload.ts` | contextBridge exposing `window.ftApi` (invoke / on / off); built as CJS |
| `ipc-types.ts` | Typed IPC channel surface shared by main and renderer, including media fetch/detail/open payloads |
| `ipc-handlers.ts` | All `ipcMain.handle()` registrations; imports `src/` directly; starts selected media fetch jobs, exposes downloaded media URLs, and opens manifest-backed media targets |

#### React renderer (`gui/renderer/`)
| File | Purpose |
|---|---|
| `main.tsx` | React entry point |
| `app.tsx` | Navigation state machine, update-ready banner |
| `bookmark-export.ts` | Renderer-side selected bookmark JSON serialization and download helper; enriches exports with downloaded media metadata from `media:bookmark` |
| `styles.css` | Tailwind base + custom scrollbar |
| `hooks/useIpc.ts` | `invoke<T>()` helper and `useIpcEvent()` hook |
| `components/MediaPreviewCard.tsx` | Shared downloaded-media preview card with local open, file reveal, and remote source actions |
| `components/Sidebar.tsx` | Left-rail navigation; shows `v{__APP_VERSION__}` at bottom |
| `screens/DashboardScreen.tsx` | Status metrics, quick-action buttons, category pills |
| `screens/ListScreen.tsx` | Paginated bookmark list with multi-select, JSON export, selected media fetch, bulk delete, reset classification |
| `screens/SearchScreen.tsx` | Full-text search with BM25 results, result selection, JSON export, selected media fetch |
| `screens/BookmarkDetailScreen.tsx` | Full tweet, downloaded media, article, quoted tweet, engagement, single-bookmark actions |
| `screens/SyncScreen.tsx` | Sync trigger with live progress; "Remove from X after sync" option |
| `screens/ClassifyScreen.tsx` | LLM classify with two-phase progress; "Reset all first" option |
| `screens/VizScreen.tsx` | 14-panel Recharts dashboard |
| `screens/StatsScreen.tsx` | Author leaderboard, language breakdown |
| `screens/CategoriesScreen.tsx` | Category bar chart |
| `screens/DomainsScreen.tsx` | Subject domain bar chart |
| `screens/FoldersScreen.tsx` | X folder distribution |
| `screens/MediaScreen.tsx` | Fetch media with progress and recent downloaded-media gallery |
| `screens/SettingsScreen.tsx` | Data path, index rebuild |

#### New source files (`src/`)
| File | Purpose |
|---|---|
| `bookmark-delete.ts` | Bulk `DeleteBookmark` GraphQL mutation via browser-cookie auth |

#### Modified source files (`src/`)
| File | Change |
|---|---|
| `bookmarks-db.ts` | Added `resetClassification()`, `getAllTweetIds()`, `snapshotBookmarks()`, `listSnapshots()`, `restoreSnapshot()` |
| `bookmarks-viz.ts` | Exported `getVizData()`, `VizData`, `GemBookmark` types |

#### Build scripts
| File | Purpose |
|---|---|
| `build/patch-appimage.mjs` | Post-pack: strips `X-AppImage-Version` from the AppImage `.desktop` file to prevent AppImageLauncher appending the version to the app name |

---

## Architecture

### Process model

```
┌─────────────────────────────────────────────┐
│  Electron main process (Node.js)             │
│  gui/main/main.ts + ipc-handlers.ts          │
│                                             │
│  Imports src/* directly — sql.js WASM,      │
│  file I/O, cookie extraction all run here.  │
└──────────────────┬──────────────────────────┘
                   │  IPC (contextBridge)
                   │  window.ftApi.invoke / .on / .off
┌──────────────────▼──────────────────────────┐
│  Renderer process (Chromium)                 │
│  gui/renderer/ — React 18 + Tailwind         │
│                                             │
│  No Node.js access. All data comes          │
│  through typed IPC channels.                │
└─────────────────────────────────────────────┘
```

### IPC patterns

**Request-reply** (data queries):
```ts
// Renderer
const items = await invoke<BookmarkTimelineItem[]>('bookmarks:list', filters)

// Main
ipcMain.handle('bookmarks:list', (_e, filters) => listBookmarks(filters))
```

**Streaming progress** (long-running jobs):
```ts
// Main — fires events during the job
const jobId = crypto.randomUUID()
syncBookmarksGraphQL({ onProgress: (p) => win.webContents.send('sync:progress', { ...p, jobId }) })
return { jobId }  // renderer subscribes with useIpcEvent('sync:progress', handler, [jobId])
```

### Build outputs

| Target | Output dir | Format |
|---|---|---|
| CLI | `dist/` | ES2022 ESM (unchanged) |
| Electron main | `dist-gui/main/` | ESM |
| Electron preload | `dist-gui/preload/preload.js` | **CJS** (Electron requirement) |
| React renderer | `dist-gui/renderer/` | Bundled ESM + CSS |

The preload is forced to CJS via `rollupOptions.output.format: 'cjs'` — Electron does not support ESM preload scripts.

### Version injection

The app version is injected from `package.json` at build time via Vite's `define`:

```ts
// electron.vite.config.ts
define: { __APP_VERSION__: JSON.stringify(version) }

// Sidebar.tsx
declare const __APP_VERSION__: string
<span>v{__APP_VERSION__}</span>
```

No IPC call needed — baked in at build time.

### Single-instance lock

`app.requestSingleInstanceLock()` in `main.ts`. A second launch quits immediately and focuses the already-running window.

---

## Feature Summary by Version

| Version | Feature | Source |
|---|---|---|
| 2.0.0 | Bulk delete from X (Browse multi-select + Sync option) | `src/bookmark-delete.ts`, `ipc-handlers.ts` |
| 2.0.0 | Reset classification (Browse + Detail + Classify screen) | `bookmarks-db.ts::resetClassification()` |
| 2.0.0 | Interactive Viz dashboard (14 Recharts panels) | `bookmarks-viz.ts::getVizData()` |
| 2.1.0 | Packaging (AppImage, deb, dmg, exe), auto-updater, icons | `electron-builder` config, `electron-updater` |
| 2.1.1 | AppImage patcher — strips `X-AppImage-Version` | `build/patch-appimage.mjs` |
| 2.1.2 | Snapshot (JSONL + SQL dump) | `bookmarks-db.ts::snapshotBookmarks()` |
| 2.1.2 | Load/restore snapshot | `bookmarks-db.ts::listSnapshots()`, `restoreSnapshot()` |
| 2.1.2 | Remove all from X (Settings) | `bookmarks-db.ts::getAllTweetIds()`, `bookmark-delete.ts` |

---

## New Features

### 1. Bulk delete from X

Removes bookmarks from the X account while keeping the local copy. Uses the same browser-cookie auth as sync.

**API:** `POST https://x.com/i/api/graphql/{DELETE_BOOKMARK_QUERY_ID}/DeleteBookmark`  
**Auth:** CSRF token + cookie header via `detectValidSessions()` — no OAuth needed  
**Rate limiting:** 250 ms delay between requests  
**Source:** `src/bookmark-delete.ts`

> **Note on the query ID:** `DELETE_BOOKMARK_QUERY_ID` in `src/bookmark-delete.ts` is `Wlmlj2-xzy44Y3-a2VzGig`. X rotates these periodically. To find the current one, intercept X network requests in browser DevTools and search for `operationName:"DeleteBookmark"` in the main bundle at `abs.twimg.com/responsive-web/client-web/main.<hash>.js`.

Available in:
- Browse screen: multi-select → "Remove from X"
- Sync screen: "Remove from X after sync" checkbox

### 2. Reset classification

Resets `primary_category = 'unclassified'` and clears `categories`, `primary_domain`, `domains` in the SQLite DB. Classification lives only in the DB; JSONL is not modified. The next classify run re-processes reset rows.

**Function:** `resetClassification(ids: string[])` in `src/bookmarks-db.ts`  
Passing an empty array resets all bookmarks.

Available in:
- Browse screen: multi-select → "Reset classification"
- Bookmark detail: single-bookmark reset button
- Classify screen: "Reset all classifications first" checkbox

---

## Packaging

### electron-builder config (`package.json` → `"build"`)

| Platform | Output |
|---|---|
| Linux | AppImage (x64) + deb (x64) |
| macOS | dmg (x64, arm64) |
| Windows | NSIS installer (x64) |

**Publish target:** GitHub Releases (`afar1/fieldtheory-cli`)

Icons: `build/icons/` — generated from `assets/images/icon-1024.png` using Pillow. All sizes from 16×16 to 1024×1024 PNG, plus multi-resolution `.ico` for Windows.

macOS `.icns` needs to be generated before packaging on/for macOS:
```bash
# From the 1024px PNG, build an iconset and convert
mkdir -p build/icons/icon.iconset
for s in 16 32 64 128 256 512 1024; do
  cp build/icons/${s}x${s}.png build/icons/icon.iconset/icon_${s}x${s}.png
done
iconutil -c icns build/icons/icon.iconset -o build/icons/icon.icns
```

### Auto-updater

`electron-updater` checks GitHub Releases on startup (packaged builds only). Downloads silently; installs on quit. A dismissible update-ready banner appears in the renderer when a download completes.

---

## Key Dependency Decisions

| Package | Version | Reason |
|---|---|---|
| `electron` | ^33 | v34–36 load both GTK 3 and GTK 4 on Ubuntu 25.04, causing a fatal startup crash. v33 uses GTK 3 only. |
| `electron-vite` | ^3 | Handles the three Electron build contexts with a single config and HMR |
| `react` | ^18 | Stable LTS |
| `recharts` | ^2 | React-native, responsive containers |
| `tailwindcss` | ^3 | v4 not yet stable with the PostCSS plugin chain used here |

---

## Linux Platform Notes

### Ubuntu 25.04 — GTK conflict

Electron v34+ links against both `libgtk-3.so.0` and `libgtk-4.so.1`. Ubuntu 25.04 ships GTK 4.20 as default; the mixed load triggers: `Gtk-ERROR: GTK 2/3 symbols detected`. Fixed by pinning to Electron v33.

### Sandbox

Linux requires the `chrome-sandbox` binary to be owned by root with SUID (`chmod 4755`). For development, `--no-sandbox` is passed instead. This is baked into the `gui:start` script. The AppImage handles sandbox setup automatically.

---

## Screens

| Screen | Sidebar label | CLI equivalent |
|---|---|---|
| DashboardScreen | Dashboard | — |
| ListScreen | Browse | `ft list` |
| SearchScreen | Search | `ft search` |
| SyncScreen | Sync | `ft sync` |
| ClassifyScreen | Classify | `ft classify` + `ft classify-domains` |
| CategoriesScreen | Categories | `ft categories` |
| DomainsScreen | Domains | `ft domains` |
| FoldersScreen | Folders | `ft folders` |
| VizScreen | Viz | `ft viz` |
| StatsScreen | Stats | `ft stats` |
| MediaScreen | Media | `ft fetch-media` |
| SettingsScreen | Settings | `ft status`, `ft path`, `ft index` |
| BookmarkDetailScreen | (from Browse/Search) | `ft show <id>` |

### Not yet ported

| CLI command | Notes |
|---|---|
| `ft wiki` / `ft md` / `ft ask` / `ft lint` | WikiScreen — planned |
| `ft possible` / `ft seeds` / `ft repos` / `ft frames` | PossibleScreen — planned |
