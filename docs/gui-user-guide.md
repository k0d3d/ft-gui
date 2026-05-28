# FT GUI — User Guide

**FT GUI v2.0.0** | Built on [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by @afar1

---

## Starting the app

```bash
# Production (run the last build)
pnpm gui:start

# Development (hot-reload, DevTools auto-open)
pnpm gui:dev

# Rebuild after code changes
pnpm gui:build

# Package for distribution
pnpm gui:pack          # Linux AppImage + deb
pnpm gui:pack:all      # Linux + macOS + Windows
```

The app reads and writes the same data as the CLI — `~/.fieldtheory/bookmarks/`. No migration needed.

---

## Screens

### Dashboard

The home screen. Shows at a glance:
- Total bookmarks, classified count, domain-classified count
- Last sync date
- Category pills (click any to go to Categories)
- Quick-action buttons for Sync, Browse, Search, and Classify

### Browse

Full paginated list of your bookmark library (30 per page).

**Select mode** — click "Select" in the toolbar to enter multi-select. Check individual rows or use "Select all on page." With items selected, two bulk actions appear:

- **Reset classification** — clears categories and domains for selected bookmarks so the next classify run re-processes them
- **Remove from X** — un-bookmarks selected items from your X account; your local copy is kept

Click any row (outside select mode) to open the Bookmark Detail screen.

### Search

Full-text search across bookmark text, author handles, and extracted article content. Uses SQLite FTS5 with BM25 relevance ranking. Press Enter or click Search. Click any result to open detail.

### Bookmark Detail

Shows the full tweet text, extracted article (title, body, source site), quoted tweet if any, categories, domains, X folders, and engagement stats (likes, reposts, views).

**Actions:**
- **Open on X** — opens the tweet in your system browser
- **Reset classification** — marks this bookmark as unclassified

### Sync

Pulls bookmarks from X using your browser session (Chrome, Firefox, Brave, or Edge must be open and logged into X).

**Options:**
- **Full rebuild** — fetches all bookmarks instead of stopping at the newest locally-stored one. Use if you think the incremental sync missed items.
- **Remove from X after sync** — once the sync completes and bookmarks are stored locally, un-bookmarks newly-added items from your X account. Good for a "process and clear" workflow.

A live progress bar shows pages fetched and new bookmarks added. When complete, total bookmarks and stop reason are displayed.

### Classify

Runs LLM classification on bookmarks without a category or domain.

**Options:**
- **Engine override** — leave blank to use the saved default (`ft model`). Enter `claude`, `codex`, or an OpenAI-compatible endpoint.
- **Reset all classifications first** — clears all categories and domains before running, giving a clean re-classify from scratch.

Progress shows two phases: **categories** (tool, research, technique, etc.) then **domains** (ai, finance, devops, etc.).

### Categories / Domains / Folders

Read-only distribution charts. Categories and domains are populated by running Classify. Folders mirror your X bookmark folder structure (populated by `ft sync --folders`).

### Viz

Interactive version of `ft viz`. Fourteen panels:

| Panel | Chart type |
|---|---|
| Header metrics | Stat cards |
| Publication rhythm | Area chart |
| Post weekdays | Radar chart |
| Posting hours (UTC) | Bar chart |
| Who you listen to | Horizontal bar chart (top 20 authors) |
| Where links lead | Horizontal bar chart (top domains) |
| Categories | Horizontal bars |
| Subject domains | Horizontal bars |
| Composition | Stat cards (media %, links %, text-only %) |
| Time capsules | Card list (oldest bookmark per year) |
| Hidden gems | Card list (one-time authors, long text) |
| Rising voices | Pill list (new authors in latest month) |
| Languages | Pill list |

### Stats

Numeric summary: total bookmarks, unique voices, date range. Top 15 authors with bar chart. Language breakdown.

### Media

Downloads images and video poster frames for bookmarks. Set an optional limit to cap the run. Media saves to `~/.fieldtheory/bookmarks/media/`.

### Settings

- **Data location** — shows the path to `~/.fieldtheory/bookmarks/`
- **Rebuild index** — rebuilds the SQLite search index from the JSONL cache (preserves classification)
- **Force rebuild** — drops all tables first (clears classification) then rebuilds from JSONL. Only use if the index is corrupted.

---

## Remove from X — how it works

When you click **Remove from X** (Browse multi-select or Sync option), the app:

1. Detects your active browser session (same as Sync — Chrome, Firefox, Brave, or Edge)
2. Sends a `DeleteBookmark` GraphQL mutation to X for each selected tweet, with a 250 ms delay between requests
3. Reports how many succeeded and how many failed

**Your local copy is never touched.** The bookmark stays in `bookmarks.jsonl` and the SQLite index. Only your X bookmark list is updated.

If deletions fail, the most likely cause is an expired session cookie. Open X in your browser, refresh, then try again.

---

## Reset classification — how it works

Resetting sets `primary_category = 'unclassified'` and clears `categories`, `primary_domain`, `domains` in the SQLite DB. The JSONL is not modified (classification lives only in the DB).

After a reset, the next classify run picks up the affected bookmarks as if they were never classified. You can reset:

- **Individual bookmarks** — Bookmark Detail screen
- **Selected bookmarks** — multi-select in Browse → "Reset classification"
- **All bookmarks** — Classify screen → "Reset all classifications first" before starting

---

## Auto-updates

In packaged builds (AppImage, deb, dmg, exe), the app checks [GitHub Releases](https://github.com/afar1/fieldtheory-cli/releases) on startup. If a newer version is available, it downloads in the background. When the download is complete, a dismissible banner appears at the top of the window:

> *v2.1.0 is ready — restart to update*

The update installs on next quit. No action needed beyond restarting.

---

## Troubleshooting

**Black window on launch**  
The preload script failed to load. Run `pnpm gui:build` and check for build errors. On Linux, confirm you're running with `--no-sandbox` (built into `pnpm gui:start`) or that `chrome-sandbox` has the correct SUID permissions.

**"No browser session found" when syncing or deleting**  
Open `x.com` in Chrome, Firefox, Brave, or Edge, make sure you're logged in, then try again. The app reads your browser's local cookie store.

**Delete from X fails for all items**  
The `DeleteBookmark` query ID in `src/bookmark-delete.ts` may have been rotated by X. To find the current ID: open X in your browser, open DevTools → Network, perform any bookmark action, filter for `DeleteBookmark`, and read the `queryId` from the request payload. Update `DELETE_BOOKMARK_QUERY_ID` in `src/bookmark-delete.ts` and rebuild.

**Search returns no results after a sync**  
The FTS index may be stale. Go to Settings → Rebuild index.

**App won't start on Ubuntu 25.04 (GTK crash)**  
The app requires Electron v33. If you see `Gtk-ERROR: GTK 2/3 symbols detected`, run `pnpm install` and confirm `electron@33.x` is installed (not v34+). This is a known GTK 3/4 conflict in newer Ubuntu versions.

**App opens but sidebar/content is black**  
Run `pnpm gui:build` to ensure the app is built. Then run `pnpm gui:start`. If still black, check the terminal for `[renderer]` error lines — the most common cause is a failed preload.

---

## CLI commands (quick reference)

The CLI (`ft`) works alongside the GUI and uses the same data.

```bash
ft sync                   # sync from browser session
ft sync --rebuild         # full re-crawl
ft sync --folders         # also sync X bookmark folders
ft search "query"         # full-text search
ft list --category tool   # filter list
ft show <id>              # single bookmark detail
ft classify               # LLM classify
ft classify --regex       # regex classify (no LLM)
ft model                  # view/change default LLM engine
ft viz                    # terminal dashboard
ft stats                  # stats summary
ft categories             # category distribution
ft domains                # domain distribution
ft folders                # folder distribution
ft md                     # export as markdown files
ft wiki                   # compile knowledge base
ft ask "question"         # query the knowledge base
ft index                  # rebuild SQLite index
ft status                 # sync status
ft path                   # data directory path
ft skill install          # install /fieldtheory skill for Claude Code / Codex
```
