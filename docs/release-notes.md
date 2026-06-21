# FT GUI — Release Notes

---

## v2.1.10 — Selected JSON Export

**Released:** 2026-06-21

This patch adds selected-bookmark JSON export to the desktop GUI.

### What changed

- **Browse export** — select one or more bookmarks in Browse and click **Export JSON** to download a `.json` file.
- **Search selection** — Search results now support select mode, per-result checkboxes, select-all, selected count, and **Export JSON**.
- **Uniform payload shape** — exported JSON is always an array, including single-bookmark exports.
- **Full records from Search** — Search export fetches each full bookmark record before download, falling back to the search result if a record is unavailable.

### Verification

- `pnpm exec tsx --test tests/gui-bookmark-export.test.ts`
- `pnpm gui:build`

---

## v2.1.8 — Classify Progress Feedback

**Released:** 2026-05-28

This patch fixes a weak spot in the classify workflow: the GUI now shows useful feedback while classification is running and a concrete summary when it finishes.

### What changed

- **Classify now shows immediate progress state** instead of leaving the screen stuck with only a disabled button until the first batch completes.
- **Live classify progress** continues to show `done / total` for the active phase.
- **Completion summaries** now include classified and failed counts for both the categories phase and the domains phase.
- **Docs/version drift fixed** so the README and GUI user guide match the current release line again.

### Verification

- `npx tsc -p tsconfig.gui.json --noEmit`
- `npx tsc -p tsconfig.json --noEmit`

---

## v2.1.6 — OpenAI Settings, Sticky Screens, Startup Timing

**Released:** 2026-05-28

This patch adds persisted OpenAI GUI settings, keeps screen state alive across navigation, and exposes startup timing data to help debug slow launch and freezes.

### What changed

- **Settings → OpenAI** now stores an OpenAI-compatible base URL and API key in the local preferences file, and GUI classification reuses those settings automatically.
- **Screen state is preserved across navigation** for visited base screens, so in-progress operations no longer visually reset just because you switch to another tab and come back.
- **Startup profiling** now records timing marks in the main process, shows them in **Settings → Performance**, and supports verbose startup timing logs with `FT_GUI_PROFILE_STARTUP=1`.
- **Startup health work is deferred slightly** so expensive background checks are less likely to block the first visible window paint.
- **Linux install guidance** now recommends the `.deb` build first when startup consistency matters, with `AppImage` kept as the portable fallback.

### Verification

- `node --import tsx --test tests/delete-job.test.ts tests/gui-screen-cache.test.ts`
- `node --import tsx --test --test-name-pattern "preferences: round-trip save and load|detectAvailableEngines: returns array of available engines|openai config prefers saved preferences over environment variables" tests/engine.test.ts`
- `npx tsc -p tsconfig.gui.json --noEmit`
- `npx tsc -p tsconfig.json --noEmit`

---

## v2.1.5 — GUI Delete Flow Hardening

**Released:** 2026-05-28

This patch closes several gaps in the Electron GUI around long-running jobs and bookmark deletion.

### What changed

- **Browse → Remove from X** now uses the same background job flow as Settings, so selected-item deletes work again and show live progress instead of relying on a stale synchronous IPC path.
- **Settings → Remove all bookmarks from X** keeps tracking progress even if the first IPC event arrives before the renderer stores the returned `jobId`.
- **Sync, Classify, and Media** now use the same defensive job-handshake pattern, reducing the chance of a fast start/error event leaving the screen stuck without progress.
- **Dashboard** now imports its status type from the IPC type layer directly and uses Tailwind-safe accent classes, avoiding renderer build drift.

### Verification

- `node --import tsx --test tests/delete-job.test.ts`
- `npx tsc -p tsconfig.gui.json --noEmit`

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

- **`X-AppImage-Version` stripped** — `build/patch-appimage.mjs` runs automatically after `electron-builder`. It finds the squashfs inside the AppImage, extracts it with `unsquashfs`, removes the `X-AppImage-Version=` line from the `.desktop` file, repacks with `mksquashfs`, and reassembles in place.
- **Historical note** — this release briefly standardized the AppImage filename to `FT-GUI.AppImage` to reduce duplicate AppImageLauncher entries. Current releases use versioned filenames again.

**If AppImageLauncher shows duplicate entries:** Remove old "FT GUI (2.x.x)" launchers in AppImageLauncher and reintegrate the current AppImage.

---

## v2.1.0 — FT GUI: Packaging & Auto-Updates

**Released:** 2026-05-28

Named the app **FT GUI**, added distributable packaging for Linux / macOS / Windows, and wired up automatic updates.

### App name and version

The app is now called **FT GUI** everywhere — window title, sidebar, HTML title, desktop entry. The version number is no longer part of the app name; it's shown subtly at the bottom of the sidebar only. The version is injected from `package.json` at build time.

### Distribution packages

```bash
pnpm gui:pack        # Linux: FT-GUI-<version>.AppImage + FT-GUI-<version>.deb → release/
pnpm gui:pack:all    # + macOS dmg + Windows NSIS exe
```

| Platform | Format | Notes |
|---|---|---|
| Linux | AppImage | Portable, no install required. Integrates with AppImageLauncher. |
| Linux | deb | System install via `sudo dpkg -i`. Cleanest launcher entry. |
| macOS | dmg | Universal (x64 + arm64) |
| Windows | exe (NSIS) | Installer with custom directory option |

### Auto-updates

In packaged builds, the app checks [GitHub Releases](https://github.com/k0d3d/ft-gui/releases) on startup. When a new version is found, it downloads in the background. When the download completes, a dismissible banner appears at the top of the window:

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
