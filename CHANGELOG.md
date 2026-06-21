# Changelog

All notable changes to FT GUI are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

Built on [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1).

---

## [2.1.12] — 2026-06-21

### Added
- **Media-aware JSON export** — selected bookmark exports include `downloadedMedia` when matching media has already been fetched
  - Media entries include external `sourceUrl` for remote download workflows
  - Media entries also include `localPath`, `contentType`, `bytes`, and `fetchedAt` when available
  - Browse and Search export paths both enrich selected bookmark records from the media manifest

---

## [2.1.11] — 2026-06-21

### Added
- **Selected media fetch** — Browse and Search can fetch post media for selected bookmarks
  - Selected fetch skips profile images and downloads only post/quoted-post media
  - Fetch progress is shown inline with the selected action controls
  - Bookmark Detail renders downloaded images and videos from the media manifest when available

---

## [2.1.10] — 2026-06-21

### Added
- **Selected JSON export** — Browse and Search can export selected bookmarks to a `.json` file
  - Export payloads are always arrays, including single-bookmark exports
  - Browse exports selected visible bookmark records
  - Search now has select mode, checkboxes, select-all, selected count, and JSON export
  - Search export fetches full bookmark records before download, with search results as fallback

---

## [2.1.2] — 2026-05-28

### Added
- **Snapshot feature** — take a point-in-time backup of your bookmark library from Settings
  - Saves `bookmarks.jsonl` (raw source of truth) + `bookmarks.sql` (full SQL dump including all classifications, domains, enrichments, folder tags) + `manifest.json`
  - Optional label field (e.g. `before-delete`) embedded in the directory name
  - Snapshots land in `~/.fieldtheory/bookmarks/snapshots/`
- **Load snapshot / restore** — restore your library from any saved snapshot
  - Lists all snapshots in Settings, newest first, with date, label, and record count
  - Inline "Overwrite current library?" confirmation on the restore row (prevents accidental overwrites)
  - Full restore: replaces `bookmarks.jsonl` and replays the SQL dump against a fresh DB, then rebuilds the FTS index
  - Record count in Settings header updates immediately after restore
- **Remove all from X** — Settings section to bulk-un-bookmark your entire local library from X in one operation
  - Shows your total bookmark count before you start
  - Amber warning banner; checkbox confirmation required before the button activates
  - Live progress bar with count and percentage
  - Rate-limited to 250 ms per request; explains estimated time for large libraries

### Changed
- Settings screen reorganised: Data location → Search index → Snapshot → Load snapshot → Remove all from X

---

## [2.1.1] — 2026-05-28

### Fixed
- **Duplicate launcher entries** — AppImage filename no longer includes the version (`FT-GUI.AppImage` instead of `FT GUI-2.1.0.AppImage`). AppImageLauncher now treats all versions as the same app, preventing multiple entries.
- **Version in launcher name** — added `build/patch-appimage.mjs` post-pack script that strips `X-AppImage-Version` from the embedded `.desktop` file inside the AppImage. AppImageLauncher reads this field and appends it in parentheses to the displayed name; removing it gives a clean "FT GUI" entry.
- `gui:pack` now runs: `electron-vite build → electron-builder → patch-appimage.mjs`

---

## [2.1.0] — 2026-05-28

### Added
- **App renamed to FT GUI** — window title, sidebar logo, HTML title all updated
- **Version display** — current version shown subtly at the bottom of the sidebar; injected from `package.json` at build time via Vite `define` (no IPC call)
- **Packaging** — `electron-builder` config for Linux (AppImage + deb), macOS (dmg), Windows (NSIS installer)
  - `pnpm gui:pack` → `release/FT-GUI.AppImage` + `release/FT-GUI.deb`
  - `pnpm gui:pack:all` → all three platforms
- **Icons** — all required sizes generated (16–1024 px PNG + multi-resolution `.ico`) from `assets/images/icon-1024.png`
- **Auto-updater** — `electron-updater` checks GitHub Releases on startup; downloads silently, installs on quit; active only in packaged builds
- **Update-ready banner** — dismissible mint-green banner appears in the renderer when a new version download completes
- **Single-instance lock** — launching a second instance focuses the existing window instead of opening a duplicate
- **`author` field** in `package.json` (required by electron-builder)

### Fixed
- AppImage license field pointed to the literal string `"MIT"` instead of the `LICENSE` file path — fixed to `"LICENSE"`

---

## [2.0.0] — 2026-05-28

### Added
- **Electron desktop GUI** — full desktop app alongside the existing `ft` CLI
  - All CLI commands surfaced as GUI screens
  - Sidebar navigation with groups: Bookmarks · Classify · Explore · Tools
  - Dark theme with Field Theory colour palette (lavender, periwinkle, mint, peach, coral, amber)

- **Screens**
  - **Dashboard** — total bookmarks, classified/domain counts, last sync date, category pills, quick-action buttons
  - **Browse (List)** — paginated list (30/page), multi-select mode, bulk actions
  - **Search** — full-text BM25 search across tweet text, author handles, and article content
  - **Bookmark Detail** — full tweet, extracted article (title/body/site), quoted tweet, categories/domains/folders, engagement stats
  - **Sync** — start sync with live progress bar; "Full rebuild" and "Remove from X after sync" options
  - **Classify** — LLM classify with two-phase progress (categories → domains); "Reset all first" option
  - **Viz** — interactive Recharts dashboard with 14 panels (rhythm, weekday radar, hour chart, top authors, top domains, categories, domains, composition, time capsules, hidden gems, rising voices, languages)
  - **Stats** — top authors bar chart, language breakdown, date range
  - **Categories / Domains / Folders** — distribution bar charts
  - **Media** — fetch media with live progress
  - **Settings** — data path display, index rebuild (standard + force)

- **Bulk delete from X** (new capability, no equivalent in CLI)
  - Multi-select in Browse → "Remove from X" — un-bookmarks selected items from X, keeps local copy
  - "Remove from X after sync" checkbox in Sync screen
  - Uses same browser-cookie GraphQL auth as sync — no OAuth re-auth needed
  - Rate-limited to 250 ms between requests; `src/bookmark-delete.ts`

- **Reset classification** (new capability)
  - Multi-select in Browse → "Reset classification" — clears categories/domains for selected bookmarks
  - Single-bookmark reset in Bookmark Detail
  - "Reset all classifications first" in Classify screen
  - `resetClassification(ids)` added to `src/bookmarks-db.ts`

- **IPC architecture** — typed channel surface in `gui/main/ipc-types.ts`; request-reply and streaming-progress patterns; CJS preload built separately from ESM main

- **New `src/` exports**
  - `bookmarks-db.ts`: `resetClassification()`, `countBookmarks()`, `getAllTweetIds()`
  - `bookmarks-viz.ts`: `getVizData()`, exported `VizData` and `GemBookmark` types
  - `bookmark-delete.ts`: `deleteXBookmarks()` via internal `DeleteBookmark` GraphQL mutation

### Changed
- `package.json`: added `"main": "dist-gui/main/main.js"`, GUI scripts, Electron + React dependencies
- Cross-platform: Linux now supported natively (previously "Designed for Mac")

### Technical notes
- Electron pinned to v33 — v34+ load both GTK 3 and GTK 4 on Ubuntu 25.04 causing a fatal startup crash
- Preload built as CommonJS (Electron requirement); main process as ESM
- `sql.js` WASM and all file I/O run exclusively in the Electron main process

---

## [1.3.20] — pre-GUI baseline

Original [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1).

Parallel classification, API-based LLM support, improved browser detection on Linux. Full CLI feature set: sync, search, classify, viz, wiki, possible/seeds, agent skill.
