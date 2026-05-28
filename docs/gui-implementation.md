# Field Theory GUI — Implementation Report

**Date:** 2026-05-28  
**Branch:** master  
**Base commit:** ffd0233

---

## Overview

This report covers the addition of an Electron desktop GUI to the Field Theory CLI. The CLI remains fully intact and functional (`ft` command, `npm run build`, etc.). The GUI is a separate build target that shares the same data layer.

---

## What Was Built

### New CLI commands

| Command | Description |
|---|---|
| `pnpm gui:dev` | Dev mode with hot-reload (Vite dev server + Electron) |
| `pnpm gui:build` | Production build → `dist-gui/` |
| `pnpm gui:start` | Launch the built app |

### New files

#### Build & config
| File | Purpose |
|---|---|
| `electron.vite.config.ts` | electron-vite build config (main, preload, renderer) |
| `tsconfig.gui.json` | TypeScript config for `gui/` (bundler module resolution, JSX) |
| `tailwind.config.js` | Tailwind CSS with Field Theory colour palette |
| `postcss.config.js` | PostCSS config for Tailwind |

#### Electron main process (`gui/main/`)
| File | Purpose |
|---|---|
| `main.ts` | BrowserWindow lifecycle, DevTools in dev mode |
| `preload.ts` | contextBridge exposing `window.ftApi` (invoke / on / off) |
| `ipc-types.ts` | Typed IPC channel surface shared by main and renderer |
| `ipc-handlers.ts` | All `ipcMain.handle()` registrations; calls `src/` directly |

#### React renderer (`gui/renderer/`)
| File | Purpose |
|---|---|
| `main.tsx` | React entry point |
| `app.tsx` | Navigation state machine, screen routing |
| `styles.css` | Tailwind base + scrollbar styles |
| `hooks/useIpc.ts` | `invoke<T>()` helper and `useIpcEvent()` hook |
| `components/Sidebar.tsx` | Left-rail navigation with group labels |
| `screens/DashboardScreen.tsx` | Status metrics, quick-action buttons, category pills |
| `screens/ListScreen.tsx` | Paginated bookmark list with multi-select |
| `screens/SearchScreen.tsx` | Full-text search with results |
| `screens/BookmarkDetailScreen.tsx` | Single bookmark: full text, quoted tweet, article, actions |
| `screens/SyncScreen.tsx` | Sync trigger with live progress bar |
| `screens/ClassifyScreen.tsx` | LLM classify with two-phase progress |
| `screens/StatsScreen.tsx` | Author leaderboard, language breakdown |
| `screens/VizScreen.tsx` | Recharts dashboard (14 panels) |
| `screens/CategoriesScreen.tsx` | Category bar chart |
| `screens/DomainsScreen.tsx` | Subject domain bar chart |
| `screens/FoldersScreen.tsx` | X folder distribution |
| `screens/MediaScreen.tsx` | Fetch media with progress |
| `screens/SettingsScreen.tsx` | Data path display, index rebuild |

#### New source files (`src/`)
| File | Purpose |
|---|---|
| `bookmark-delete.ts` | Bulk `DeleteBookmark` GraphQL mutation via cookie auth |

#### Modified source files (`src/`)
| File | Change |
|---|---|
| `bookmarks-db.ts` | Added `resetClassification(ids)` export |
| `bookmarks-viz.ts` | Exported `getVizData()` and `VizData`/`GemBookmark` types |
| `package.json` | Added Electron + React deps; `pnpm.onlyBuiltDependencies`; `"main"` field |

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

**Request-reply** (used for data queries):
```ts
// Renderer
const items = await invoke<BookmarkTimelineItem[]>('bookmarks:list', filters)

// Main
ipcMain.handle('bookmarks:list', (_e, filters) => listBookmarks(filters))
```

**Streaming progress** (used for long-running jobs):
```ts
// Main — sends events while the job runs
const jobId = crypto.randomUUID()
syncBookmarksGraphQL({ onProgress: (p) => win.webContents.send('sync:progress', { ...p, jobId }) })
return { jobId }

// Renderer — subscribes in useEffect
useIpcEvent('sync:progress', (p) => { if (p.jobId === jobId) setProgress(p) }, [jobId])
```

### Data flow (unchanged from CLI)

```
Chrome/Firefox cookies
        ↓
GraphQL API (X internal)
        ↓
JSONL cache (~/.fieldtheory/bookmarks/bookmarks.jsonl)   ← source of truth
        ↓
SQLite FTS5 index (bookmarks.db)   ← rebuilt from JSONL on demand
        ↓
IPC handlers → React screens
```

### Build outputs

| Target | Output dir | Format |
|---|---|---|
| CLI | `dist/` | ES2022 ESM (unchanged) |
| Electron main | `dist-gui/main/` | ESM (Rollup) |
| Electron preload | `dist-gui/preload/preload.js` | **CommonJS** (required by Electron) |
| React renderer | `dist-gui/renderer/` | Bundled ESM + CSS |

The preload is forced to CJS via `rollupOptions.output.format: 'cjs'` in `electron.vite.config.ts` — Electron does not support ESM preload scripts.

### Key dependency decisions

| Package | Version | Reason |
|---|---|---|
| `electron` | ^33 | v34–36 load both GTK 3 and GTK 4 on Ubuntu 25.04, causing a fatal startup crash. v33 uses GTK 3 only. |
| `electron-vite` | ^3 | Handles the three Electron build contexts with a single config and HMR |
| `react` | ^18 | Stable LTS; `@types/react` v18 compatible |
| `recharts` | ^2 | React-native, responsive containers, good TypeScript support |
| `tailwindcss` | ^3 | v4 alpha not yet stable; v3 works with PostCSS |

---

## New Features

### 1. Bulk delete from X

Removes bookmarks from your X account (un-bookmarks them) while keeping them in your local library. Uses the same browser-cookie authentication as sync — no OAuth re-auth needed.

**API:** `POST https://x.com/i/api/graphql/{DELETE_BOOKMARK_QUERY_ID}/DeleteBookmark`  
**Auth:** CSRF token + cookie header from Chrome/Firefox session (via `detectValidSessions()`)  
**Rate limiting:** 250 ms delay between requests  

> **Note:** `DELETE_BOOKMARK_QUERY_ID` in `src/bookmark-delete.ts` is `Wlmlj2-xzy44Y3-a2VzGig`. X rotates these IDs occasionally. If deletes stop working, intercept X network requests in browser DevTools and search for `operationName:"DeleteBookmark"` in the main JS bundle at `abs.twimg.com/responsive-web/client-web/main.<hash>.js`.

Available in two places:
- **Browse screen** — multi-select bookmarks → "Remove from X" button
- **Sync screen** — "Remove from X after sync" checkbox (removes newly synced items once stored locally)

### 2. Reset classification

Clears `categories`, `primary_category`, `domains`, `primary_domain` columns in the SQLite DB for selected bookmarks (or all of them), setting `primary_category = 'unclassified'`. The next classify run picks them up fresh.

**Function:** `resetClassification(ids: string[])` in `src/bookmarks-db.ts`  
Passing an empty array resets all bookmarks.

Available in two places:
- **Browse screen** — multi-select → "Reset classification"
- **Bookmark detail screen** — single-bookmark reset
- **Classify screen** — "Reset all classifications first" checkbox before LLM run

---

## Linux / Platform Notes

### Ubuntu 25.04 (GTK conflict)

Electron v34+ loads both `libgtk-3.so.0` and `libgtk-4.so.1` on startup. Ubuntu 25.04 ships GTK 4.20 as default; the mixed load triggers a fatal `Gtk-ERROR: GTK 2/3 symbols detected`. Fixed by pinning to Electron v33.

### Sandbox

Linux requires the `chrome-sandbox` binary to be owned by root with SUID (`chmod 4755`). For development, `--no-sandbox` is passed instead. This is set in `package.json`'s `gui:start` script.

---

## Screens Reference

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
| `ft wiki` / `ft md` / `ft ask` / `ft lint` | WikiScreen — planned Phase 5 |
| `ft possible` / `ft seeds` / `ft repos` / `ft frames` | PossibleScreen — planned Phase 5 |
