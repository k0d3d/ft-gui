# FT GUI — Release Notes

---

## v2.1.2 — Snapshots & Bulk Remove

**Released:** 2026-05-28

This release adds the ability to save and restore your entire bookmark library — JSONL source of truth plus SQL dump — as a single operation. It also surfaces the "Remove all from X" action in Settings for a clean one-button workflow to clear your X bookmark list after syncing locally.

### Snapshot

Go to **Settings → Snapshot**. Add an optional label (e.g. `before-delete`) and click **Take snapshot**.

Each snapshot saves three files to `~/.fieldtheory/bookmarks/snapshots/snapshot_YYYY-MM-DDTHH-MM-SS_label/`:

| File | Contents |
|---|---|
| `bookmarks.jsonl` | Raw bookmark cache — every field as synced from X |
| `bookmarks.sql` | Full SQL dump: `CREATE TABLE` + one `INSERT` per bookmark, including all classification, domain, article enrichment, and folder tag state |
| `manifest.json` | Timestamp, label, record count |

**Why SQL and JSONL?** The JSONL is the source of truth for raw tweet data. The SQL dump captures the enriched state — LLM classifications, subject domains, extracted article content — which lives only in the DB and isn't stored in the JSONL. You need both to fully restore.

### Load snapshot

**Settings → Load snapshot** lists all your snapshots newest-first. Each row shows the date, time, label, and record count. Click **Restore** for an inline confirmation, then **Yes, restore** to proceed.

Restore overwrites `bookmarks.jsonl` and replays the SQL dump against a freshly-wiped DB, then rebuilds the FTS search index. You're back to the exact state you were in when the snapshot was taken — classifications and all.

### Remove all from X

**Settings → Remove all bookmarks from X** — for the "sync and clear" workflow. Check the confirmation checkbox, click **Remove all from X**, and the app sends a `DeleteBookmark` mutation for every bookmark in your local library, 250 ms apart. A progress bar shows the count. Your local library (`bookmarks.jsonl`, DB) is untouched; only your X bookmark list is cleared.

---

## v2.1.1 — Launcher Name Fix

**Released:** 2026-05-28

Quick patch to fix the launcher showing "FT GUI (2.1.1)" and creating duplicate entries.

### What was happening

AppImageLauncher tracks each AppImage by filename. The filenames `FT GUI-2.0.0.AppImage`, `FT GUI-2.1.0.AppImage`, etc. each created a separate launcher entry. AppImageLauncher also reads `X-AppImage-Version` from the embedded `.desktop` file and appends it in parentheses to the displayed name.

### What changed

- **AppImage filename** — now always `FT-GUI.AppImage` (no version). AppImageLauncher sees all versions as the same app; new installs replace the old entry.
- **`X-AppImage-Version` stripped** — `build/patch-appimage.mjs` runs automatically after `electron-builder`. It finds the squashfs inside the AppImage, extracts it with `unsquashfs`, removes the `X-AppImage-Version=` line from the `.desktop` file, repacks with `mksquashfs`, and reassembles in place.

**To fix existing duplicate entries:** Remove each old "FT GUI (2.x.x)" entry in AppImageLauncher (right-click → Remove), then integrate the new `FT-GUI.AppImage`.

---

## v2.1.0 — FT GUI: Packaging & Auto-Updates

**Released:** 2026-05-28

Named the app **FT GUI**, added distributable packaging for Linux / macOS / Windows, and wired up automatic updates.

### App name and version

The app is now called **FT GUI** everywhere — window title, sidebar, HTML title, desktop entry. The version number is no longer part of the app name; it's shown subtly at the bottom of the sidebar only. The version is injected from `package.json` at build time.

### Distribution packages

```bash
pnpm gui:pack        # Linux: FT-GUI.AppImage + FT-GUI.deb → release/
pnpm gui:pack:all    # + macOS dmg + Windows NSIS exe
```

| Platform | Format | Notes |
|---|---|---|
| Linux | AppImage | Portable, no install required. Integrates with AppImageLauncher. |
| Linux | deb | System install via `sudo dpkg -i`. Cleanest launcher entry. |
| macOS | dmg | Universal (x64 + arm64) |
| Windows | exe (NSIS) | Installer with custom directory option |

### Auto-updates

In packaged builds, the app checks [GitHub Releases](https://github.com/afar1/fieldtheory-cli/releases) on startup. When a new version is found, it downloads in the background. When the download completes, a dismissible banner appears at the top of the window:

> *v2.x.x is ready — restart to update*

The update installs on next quit. No user action required during the download.

### Icons

Icon generated from `assets/images/icon-1024.png`. Sizes: 16, 32, 48, 64, 128, 256, 512, 1024 px PNG. Multi-resolution `.ico` for Windows. macOS `.icns` to be generated before mac packaging (`iconutil -c icns build/icons/icon.iconset`).

### Single-instance lock

Launching a second instance focuses the existing window rather than opening a duplicate.

---

## v2.0.0 — Electron GUI

**Released:** 2026-05-28  
**Base:** [fieldtheory-cli v1.3.20](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1)

The first desktop GUI release. All CLI commands are now surfaced in a desktop app. The CLI (`ft`) is unchanged and continues to work alongside the GUI.

### Screens

| Screen | CLI equivalent |
|---|---|
| Dashboard | — |
| Browse | `ft list` |
| Search | `ft search` |
| Sync | `ft sync` |
| Classify | `ft classify` + `ft classify-domains` |
| Viz | `ft viz` (now interactive Recharts, 14 panels) |
| Stats | `ft stats` |
| Categories / Domains / Folders | `ft categories` / `ft domains` / `ft folders` |
| Bookmark Detail | `ft show <id>` |
| Media | `ft fetch-media` |
| Settings | `ft status` / `ft path` / `ft index` |

### New capabilities (no CLI equivalent)

**Bulk delete from X** — select any bookmarks in Browse, click "Remove from X." Un-bookmarks them from your X account while keeping your local copy. Uses the same browser-cookie GraphQL session as sync — no OAuth re-auth. The Sync screen also has a "Remove from X after sync" option for a fully automated process-and-clear workflow.

**Reset classification** — multi-select in Browse or single-click in Bookmark Detail. Marks bookmarks as unclassified; next classify run re-processes them. The Classify screen offers "Reset all first" to wipe and redo everything.

### Architecture

The app uses Electron's main/renderer split with a typed IPC layer:
- **Main process** — all Node.js work: `sql.js` WASM, file I/O, cookie extraction, GraphQL calls
- **Renderer** — React 18 + Tailwind, no direct Node.js access
- **Preload** — CJS contextBridge exposing `window.ftApi.invoke / .on / .off`

### Platform notes

- **Linux** — supported natively. Requires `--no-sandbox` for development (handled automatically in `pnpm gui:start`). Electron pinned to v33 due to GTK 3/4 conflict in v34+ on Ubuntu 25.04.
- **macOS / Windows** — via the packaged `.dmg` / `.exe`
