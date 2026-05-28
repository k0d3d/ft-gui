# Field Theory GUI — User Guide

## Starting the app

```bash
# Development (hot-reload, DevTools auto-open)
pnpm gui:dev

# Production (uses the last build)
pnpm gui:build && pnpm gui:start
```

The app reads and writes the same data as the CLI — `~/.fieldtheory/bookmarks/`. No migration needed.

---

## Screens

### Dashboard

The home screen. Shows at a glance:
- Total bookmarks, classified count, domain-classified count
- Last sync date
- Category pills (click any to go to Categories)
- Quick-action buttons to jump to Sync, Browse, Search, or Classify

### Browse

Full paginated list of your bookmark library.

**Filtering & sorting** happen via the filter state (currently `ft list` filters — date, author, category, domain, folder). Pagination is 30 per page.

**Select mode** — click "Select" in the toolbar to enter multi-select. Use the checkbox on each row or "Select all on page". With items selected, two bulk actions appear:

- **Reset classification** — clears categories/domains for selected bookmarks so the next classify run re-processes them
- **Remove from X** — un-bookmarks the selected items from your X account (your local copy is kept)

Click any row (outside select mode) to open the Bookmark Detail screen.

### Search

Full-text search across bookmark text, author handles, and extracted article content. Uses the SQLite FTS5 index with BM25 ranking. Press Enter or click Search to run. Click any result to open detail.

### Bookmark Detail

Shows the full tweet text, extracted article (title, body, source), quoted tweet if any, categories/domains/folders, and engagement stats (likes, reposts, views).

**Actions available:**
- **Open on X** — opens `https://x.com/{author}/status/{id}` in your system browser
- **Reset classification** — marks this one bookmark as unclassified

### Sync

Pulls bookmarks from X using your browser session cookies (Chrome or Firefox must be open and logged in to X).

**Options:**
- **Full rebuild** — fetches all bookmarks instead of stopping at the newest locally-stored one. Use this if you suspect the incremental sync missed items.
- **Remove from X after sync** — once the sync completes and bookmarks are stored locally, un-bookmarks all newly-added items from your X account. Good for a "read-it-and-clear" workflow.

A live progress bar shows pages fetched and new bookmarks added. When done, it reports total bookmarks and stop reason.

### Classify

Runs LLM classification on bookmarks that don't yet have a category or domain.

**Options:**
- **Engine override** — leave blank to use the saved default (`ft model`). Or enter `claude`, `codex`, or an API endpoint.
- **Reset all classifications first** — clears every bookmark's category/domain before running, giving you a clean re-classify from scratch.

Progress is shown in two phases: **categories** (what kind of content — tool, research, technique, etc.) then **domains** (subject area — ai, finance, devops, etc.).

### Categories / Domains / Folders

Read-only distribution charts. Categories and Domains are populated by running Classify. Folders mirror your X bookmark folder structure (synced by `ft sync --folders`).

### Viz

Interactive version of `ft viz`. Fourteen panels:

| Panel | What it shows |
|---|---|
| Header metrics | Total, unique voices, avg text length, date range |
| Publication rhythm | Monthly bookmarking cadence (area chart) |
| Post weekdays | Day-of-week distribution (radar chart) |
| Posting hours | UTC hour distribution (bar chart) |
| Who you listen to | Top 20 authors by bookmark count |
| Where links lead | Top linked domains |
| Categories | Category distribution (horizontal bars) |
| Subject domains | Domain distribution (horizontal bars) |
| Composition | % with media / links / text-only |
| Time capsules | Oldest bookmark per year |
| Hidden gems | One-time authors with long, substantive text |
| Rising voices | New authors appearing only in the latest month |
| Languages | Language breakdown |

### Stats

Numeric summary: total bookmarks, unique voices, date range, top 15 authors with bar chart, language breakdown.

### Media

Downloads images and video poster frames for bookmarks. Set an optional limit (e.g. 100) to cap the run. Progress shows processed / total / downloaded. Media lands in `~/.fieldtheory/bookmarks/media/`.

### Settings

- **Data location** — shows the path to `~/.fieldtheory/bookmarks/`
- **Rebuild index** — rebuilds the SQLite search index from the JSONL cache. Use if search results seem stale.
- **Force rebuild** — drops all tables first (nukes classification state) then rebuilds from JSONL. Only use if the index is corrupt.

---

## Remove from X — details

When you click **Remove from X** (in Browse or via the Sync option), the app:

1. Detects your active Chrome or Firefox X session (same mechanism as Sync)
2. Sends a `DeleteBookmark` GraphQL mutation for each selected tweet, 250 ms apart
3. Reports how many succeeded and how many failed

**Your local copy is never touched.** The bookmark stays in `bookmarks.jsonl` and the SQLite index. Only the X bookmark list is updated.

If the operation reports failures, the most likely cause is that the session cookie has expired — open X in your browser, refresh, then try again.

---

## Reset classification — details

Resetting classification sets `primary_category = 'unclassified'` and clears `categories`, `primary_domain`, `domains` in the SQLite DB. The JSONL is not modified (classification state only lives in the DB).

After a reset, the next classify run will re-process the affected bookmarks. You can reset:
- **Individual bookmarks** — from the Bookmark Detail screen
- **Selected bookmarks** — multi-select in Browse → "Reset classification"
- **All bookmarks** — Classify screen → enable "Reset all classifications first" before starting

---

## Keyboard shortcuts (standard)

| Key | Action |
|---|---|
| `⌘W` / `Alt+F4` | Close window |
| `⌘R` / `F5` | Reload (dev mode) |
| `⌘⌥I` / `F12` | Toggle DevTools (dev mode) |

---

## Troubleshooting

**Black window on launch**  
Usually means the preload script failed. Run `pnpm gui:build` and check for errors. On Linux, make sure you're using `pnpm gui:start` (which passes `--no-sandbox`).

**"No browser session found" when syncing or deleting**  
Open `x.com` in Chrome or Firefox, make sure you're logged in, then try again. The app reads your browser's cookie store directly.

**Delete from X fails for all items**  
The `DeleteBookmark` query ID in `src/bookmark-delete.ts` may have been rotated by X. Intercept an X network request in browser DevTools and search for `operationName:"DeleteBookmark"` to find the current ID.

**Search returns no results after a sync**  
The FTS index may be out of date. Go to Settings → Rebuild index.

**App won't start on Ubuntu 25.04 (GTK crash)**  
The app requires Electron v33. If you see `Gtk-ERROR: GTK 2/3 symbols detected`, run `pnpm install` to ensure `electron@33.x` is installed (not v34+).
