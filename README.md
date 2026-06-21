# FT GUI — Field Theory

Self-custody for your X/Twitter bookmarks. Sync, search, classify, and explore locally — as a desktop app or a CLI.

**v2.1.11** | [github.com/k0d3d/ft-gui](https://github.com/k0d3d/ft-gui) | Built on [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1) | MIT License | Linux · macOS · Windows

---

## Install

### Desktop app (FT GUI)

Download the latest release for your platform:

| Platform | Format |
|----------|--------|
| Linux | `.deb` (recommended) or `.AppImage` (portable fallback) |
| macOS | `.dmg` |
| Windows | `.exe` (NSIS installer) |

On Linux, prefer the `.deb` build when you want the most consistent startup behavior. The `AppImage` remains useful as a portable option, but can behave differently across systems and integration layers.

Or build from source:

```bash
git clone https://github.com/k0d3d/ft-gui
cd ft-gui
pnpm install
pnpm gui:pack          # → release/FT-GUI-<version>.AppImage + .deb
pnpm gui:start         # run the built app
```

### CLI only

```bash
npm install -g fieldtheory
```

Requires Node.js 20+.

---

## GUI screens

| Screen | What it does |
|--------|-------------|
| Dashboard | Status at a glance — sync state, classified count, quick actions |
| Browse | Paginated library with multi-select, JSON export, selected media fetch, bulk delete from X, reset classification |
| Search | Full-text BM25 search across all bookmarks and article text, with selectable JSON export and media fetch |
| Sync | Start a sync with live progress bar; optionally remove from X after syncing |
| Classify | LLM classify with two-phase progress (categories → subject domains) |
| Viz | Interactive Recharts dashboard — 14 panels (rhythm, authors, domains, gems, etc.) |
| Stats | Author leaderboard, language breakdown |
| Categories / Domains / Folders | Distribution charts |
| Bookmark detail | Full tweet, downloaded media, article, quoted tweet, engagement stats |
| Media | Fetch and download images and video posters |
| Settings | OpenAI config, index rebuild, snapshots, performance timings |

### New in v2.1.11

**Selected media fetch** — Browse and Search select mode can now fetch post media for selected bookmarks without downloading profile images. Downloaded images and videos appear inline on the Bookmark Detail screen when available.

### New in v2.1.10

**Selected JSON export** — Browse and Search now support selecting one or more bookmarks and exporting them to a `.json` file. The export payload is always an array, even when only one bookmark is selected.

### New in v2.1.6

**OpenAI settings in GUI** — Settings now lets you persist an OpenAI-compatible base URL and API key locally, so GUI classification runs can reuse them automatically without relying only on shell env vars.

**Navigation-safe long jobs** — visited base screens stay mounted after first open, so leaving Settings, Sync, Classify, or Media no longer wipes in-progress UI state when you navigate away and return.

**Startup profiling hooks** — Settings now exposes startup timing marks, and development builds can log them with `FT_GUI_PROFILE_STARTUP=1 pnpm gui:dev` to investigate slow launch or freezes.

### New in v2.0.0

**Bulk delete from X** — select any number of bookmarks in Browse, click "Remove from X." Removes them from your X account while keeping your local copy. Uses the same browser-cookie auth as sync (no OAuth needed).

**Reset classification** — multi-select bookmarks → "Reset classification" to mark them unclassified. The next classify run re-processes them from scratch. Also available per-bookmark in the detail view, and as a "reset all" option in the Classify screen.

**Auto-updater** — the app checks GitHub Releases on startup and downloads updates silently. A banner appears when a new version is ready; it installs on next quit.

---

## CLI quick start

```bash
# Sync your bookmarks (needs a browser logged into X)
ft sync

# Search
ft search "distributed systems"

# Dashboard
ft viz

# Classification
ft classify
ft categories
ft domains
```

On first run, `ft sync` detects your browser session and downloads bookmarks into `~/.fieldtheory/bookmarks/`.

---

## CLI commands

### Sync

| Command | Description |
|---------|-------------|
| `ft sync` | Incremental sync via browser session |
| `ft sync --rebuild` | Full re-crawl of all bookmarks |
| `ft sync --continue` | Resume an interrupted sync |
| `ft sync --gaps` | Backfill quoted tweets, expand truncated text, enrich linked articles |
| `ft sync --folders` | Sync X bookmark folder tags |
| `ft sync --classify` | Sync then classify with LLM |
| `ft sync --api` | Sync via OAuth v2 API (cross-platform, no browser needed) |
| `ft auth` | Set up OAuth for API-based sync |

### Search and browse

| Command | Description |
|---------|-------------|
| `ft search <query>` | Full-text search with BM25 ranking |
| `ft list` | Filter by author, date, category, domain, or folder |
| `ft show <id>` | Show one bookmark in detail |
| `ft sample <category>` | Random sample from a category |
| `ft stats` | Top authors, languages, date range |
| `ft viz` | Terminal dashboard |
| `ft categories` | Category distribution |
| `ft domains` | Subject domain distribution |
| `ft folders` | X bookmark folder distribution |

### Classification

| Command | Description |
|---------|-------------|
| `ft classify` | LLM classification (categories + domains) |
| `ft classify --regex` | Regex-only classification |
| `ft classify-domains` | Domain classification only |
| `ft model` | View or change the default LLM engine |

### Knowledge base

| Command | Description |
|---------|-------------|
| `ft md` | Export bookmarks as markdown files |
| `ft wiki` | Compile an interlinked knowledge base |
| `ft ask <question>` | Query the knowledge base |
| `ft lint` | Health-check the wiki |

### Possibility runs

| Command | Description |
|---------|-------------|
| `ft possible` | Interactive seed + repo + frame wizard |
| `ft seeds search "<query>" --create` | Save a bookmark-grounded seed |
| `ft repos add <path>` | Add a repo to the default set |
| `ft possible run --defaults` | Re-run with last-used settings |
| `ft possible nightly install` | Schedule a nightly run (macOS LaunchAgent) |

### Utilities

| Command | Description |
|---------|-------------|
| `ft index` | Rebuild search index from JSONL cache |
| `ft fetch-media` | Download media assets for bookmarks |
| `ft status` | Sync/classification status and data path |
| `ft path` | Print the data directory |
| `ft skill install` | Install `/fieldtheory` skill for Claude Code / Codex |

---

## Agent integration

Install the `/fieldtheory` skill so your AI agent searches your bookmarks automatically:

```bash
ft skill install
```

Then ask your agent:

> "What have I bookmarked about cancer research in the last three years?"

> "Find the best open-source AI memory tools I saved and suggest how to use one in this repo."

> "Every day, sync any new X bookmarks using the Field Theory CLI."

Works with Claude Code, Codex, or any agent with shell access.

---

## Scheduling

```bash
# Sync every morning at 7am
0 7 * * * ft sync

# Sync and classify every morning
0 7 * * * ft sync --classify
```

---

## Data

Stored locally under `~/.fieldtheory/`:

```
~/.fieldtheory/bookmarks/
  bookmarks.jsonl         # raw cache — source of truth
  bookmarks.db            # SQLite FTS5 search index
  bookmarks-meta.json     # sync metadata

~/.fieldtheory/library/   # ft wiki / ft md output
~/.fieldtheory/ideas/     # seeds, runs, nodes, jobs
```

Override with `FT_DATA_DIR`, `FT_LIBRARY_DIR`, `FT_COMMANDS_DIR`.

---

## Classification categories

| Category | What it catches |
|----------|----------------|
| **tool** | GitHub repos, CLI tools, npm packages |
| **security** | CVEs, vulnerabilities, exploits |
| **technique** | Tutorials, code patterns, "how I built X" |
| **launch** | Product announcements, releases |
| **research** | ArXiv papers, studies, academic findings |
| **opinion** | Takes, analysis, threads |
| **commerce** | Products, shopping |

---

## Platform support

| Feature | macOS | Linux | Windows |
|---------|-------|-------|---------|
| **FT GUI desktop app** | ✓ dmg | ✓ AppImage / deb | ✓ exe |
| Session sync (`ft sync`) | Chrome, Brave, Firefox, Edge, + more | Chrome, Brave, Firefox, Edge | Chrome, Brave, Firefox, Edge |
| OAuth sync (`ft sync --api`) | ✓ | ✓ | ✓ |
| All CLI commands | ✓ | ✓ | ✓ |

On Linux, run the GUI with `--no-sandbox` if you haven't set up the Chrome sandbox. The AppImage handles this automatically.

On Windows, use `fieldtheory` or `ft.cmd` instead of `ft` (PowerShell uses `ft` for `Format-Table`).

---

## Security

**Your data stays local.** No telemetry, no analytics, nothing phoned home.

- Browser session cookies are read from your local disk, used for the sync request, and discarded — never stored.
- All network requests go only to X's API during sync.
- OAuth tokens are stored `chmod 600` (owner-only).
- The GUI runs with context isolation — the renderer has no Node.js access.
- Fully open source — [github.com/k0d3d/ft-gui](https://github.com/k0d3d/ft-gui) (GUI) · [github.com/afar1/fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) (original CLI).

---

## License

MIT — built on [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1).
