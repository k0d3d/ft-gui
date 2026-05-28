# ✍️ Blog Writing Brief: FT GUI — Field Theory v2.0.0

> **For the writing AI agent.** Follow every section in order. Each section includes its purpose, the angle to take, keywords to weave in naturally, and specific talking points to cover. Do not invent technical details — only use what is provided in this brief. Write in a clear, practical, developer-friendly tone. Avoid fluff.

---

## Meta / SEO Header

| Field | Value |
|---|---|
| **Suggested Title** | FT GUI: Download, Organize, and Delete Your Twitter Bookmarks Locally — Now With a Desktop App |
| **Meta Description** | FT GUI is a free, open-source desktop app (and CLI) that lets you download, search, classify, bulk-delete, and organize all your X/Twitter bookmarks locally — no API key required. Available as AppImage, deb, dmg, and exe. |
| **Primary Keyword** | twitter bookmarks manager |
| **Secondary Keywords** | twitter bookmarks exporter, export twitter bookmarks free, download twitter bookmarks, delete twitter bookmarks, twitter bookmarks desktop app |
| **FAQ Keywords (use as H2/H3 subheadings)** | Can you download your Twitter bookmarks? · How do I delete all my Twitter bookmarks? · Where are my saved bookmarks on Twitter? · How do I export all my bookmarks? · Is there a desktop app for Twitter bookmarks? |
| **Target Audience** | Developers, power users, researchers, and anyone who uses X/Twitter bookmarks heavily and wants offline access, smarter organization, or the ability to bulk-manage from a desktop UI |
| **Tone** | Practical, honest, informative. First-person where appropriate. |
| **Word Count Target** | 2,000 – 2,600 words |

---

## Background and Context (read before writing)

This post covers **FT GUI v2.0.0** — a major upgrade to the original [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by [@afar1](https://github.com/afar1). The CLI remains fully intact and unchanged. v2.0.0 adds a full **Electron desktop GUI** alongside the existing terminal commands.

Key additions in v2.0.0:
1. **Desktop app** (Electron) — all CLI commands become GUI screens. Available as AppImage, .deb, .dmg, .exe.
2. **Bulk delete from X** — select multiple bookmarks, click "Remove from X." Removes them from your X account while keeping a local copy.
3. **Reset classification** — clear and re-run LLM classification on any bookmarks.
4. **Interactive Viz dashboard** — the `ft viz` terminal chart is now an interactive Recharts GUI with 14 panels.
5. **Auto-updater** — checks GitHub Releases on startup and installs updates silently.

The app is built on top of the original fieldtheory-cli codebase with credit to the original author. Reference it as: "built on [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by @afar1."

---

## Table of Contents

1. [Introduction: Your Bookmarks Deserve Better](#1)
2. [Can You Download Your Twitter Bookmarks?](#2)
3. [What is FT GUI?](#3)
4. [How It Works Under the Hood](#4)
5. [Getting Started: Install and First Sync](#5)
6. [Core Features](#6)
   - 6.1 Full-Text Search
   - 6.2 LLM Classification
   - 6.3 Interactive Viz Dashboard
   - 6.4 Bulk Delete from X
   - 6.5 Reset Classification
   - 6.6 Agent Integration
   - 6.7 Local-First Storage
7. [Where Are My Saved Bookmarks on Twitter?](#7)
8. [How to Export All Your Twitter Bookmarks](#8)
9. [How to Delete Twitter Bookmarks in Bulk](#9)
10. [Scheduling Automatic Syncs](#10)
11. [Is FT GUI Safe to Use?](#11)
12. [Frequently Asked Questions](#12)
13. [Conclusion](#13)

---

## Section Writing Instructions

---

### Section 1 — Introduction: Your Bookmarks Deserve Better {#1}

**Purpose:** Hook with the pain point, establish the context.

**Talking points:**
- X/Twitter bookmarks are a personal knowledge base that the platform treats as a flat, unsearchable list
- Free users get no folders, no search within bookmarks, no export
- Even Premium users with folders still can't bulk-manage or search across everything properly
- v2.0.0 is a desktop app that turns your bookmark backlog into an actual local library
- Reference the original open-source CLI (fieldtheory-cli by @afar1) that this builds on

**Keywords:** `twitter bookmarks manager`, `twitter bookmarks desktop app`

---

### Section 2 — Can You Download Your Twitter Bookmarks? {#2}

**Purpose:** Answer the FAQ directly and rank for it.

**Talking points:**
- X's official "Download archive" does not include bookmarks (as of writing)
- There is no native export button
- FT GUI solves this: it reads your browser session (Chrome, Firefox, Brave, Edge) and downloads all your bookmarks locally
- Runs on Linux, macOS, and Windows
- No API key or developer account needed for the default mode

**Keywords:** `Can you download your Twitter bookmarks?`, `export twitter bookmarks free`, `download twitter bookmarks`

---

### Section 3 — What is FT GUI? {#3}

**Purpose:** Introduce the product clearly.

**Talking points:**
- FT GUI is the desktop app version of the open-source fieldtheory-cli (MIT license)
- Available as AppImage / .deb for Linux, .dmg for macOS, .exe installer for Windows
- Also installable as a CLI via npm: `npm install -g fieldtheory`
- Built on top of [fieldtheory-cli](https://github.com/afar1/fieldtheory-cli) by @afar1
- The CLI remains fully functional — the GUI is additive, not a replacement
- Key screens: Dashboard, Browse (with multi-select), Search, Sync, Classify, Viz, Stats, and more

**Keywords:** `twitter bookmarks exporter`, `twitter bookmarks desktop app`, `export twitter bookmarks free`

---

### Section 4 — How It Works Under the Hood {#4}

**Purpose:** Demystify the tool.

#### Browser Session Extraction
- On sync, the app reads your local browser cookie database (Chrome, Firefox, Brave, Edge, Chromium)
- Extracts your X session token — the same one your browser uses when you're logged in
- Cookie is used for the sync request only; never stored separately; discarded after use

#### X's Internal GraphQL API
- Does not use the official X Developer API (requires paid access for bookmarks)
- Uses X's internal GraphQL API — the same one powering the Twitter web app
- No API key, no developer account required in default mode
- OAuth fallback available (`ft auth` + `ft sync --api`) for platforms where session extraction isn't available

#### Local Data Pipeline
- Bookmarks saved as `bookmarks.jsonl` (one JSON record per line) — the source of truth
- SQLite FTS5 index built at `bookmarks.db` for full-text search
- All data under `~/.fieldtheory/bookmarks/` — nothing sent to any server

**Keywords:** `download twitter bookmarks`, `How can I export all my bookmarks?`

---

### Section 5 — Getting Started: Install and First Sync {#5}

**Purpose:** Tutorial-style onboarding.

**Desktop app path:**
```bash
# Download the AppImage (Linux), dmg (macOS), or exe (Windows) from GitHub Releases
# Or build from source:
git clone https://github.com/afar1/fieldtheory-cli
cd fieldtheory-cli
pnpm install
pnpm gui:pack    # builds AppImage + deb
pnpm gui:start   # launch
```

**CLI path:**
```bash
npm install -g fieldtheory
ft sync
ft search "your topic"
ft viz
```

**Talking points:**
- First sync may take 1–5 minutes depending on how many bookmarks you have
- The app auto-detects your browser; if multiple browsers are logged into X, it picks the first valid session
- All data lands in `~/.fieldtheory/bookmarks/`
- Use `ft status` or the GUI Settings screen to confirm sync state

---

### Section 6 — Core Features {#6}

Write each as its own subsection with a command example, what it does, and why it matters.

#### 6.1 Full-Text Search
- GUI: Search screen with instant results
- CLI: `ft search "distributed systems"`
- Uses SQLite FTS5 with BM25 ranking — the same relevance algorithm used by professional search engines
- Searches tweet text, author handles, and extracted article body text
- Why it matters: X's native search can't search *your* bookmarks specifically

#### 6.2 LLM Classification
- GUI: Classify screen with two-phase progress bar (categories → subject domains)
- CLI: `ft classify` or `ft sync --classify`
- Sends bookmark text to Claude, Codex, or any OpenAI-compatible API
- Built-in categories: `tool`, `security`, `technique`, `launch`, `research`, `opinion`, `commerce`
- Regex fallback: `ft classify --regex` (no LLM needed)
- Why it matters: transforms a flat list into an organized, filterable knowledge base

#### 6.3 Interactive Viz Dashboard
- GUI: Viz screen with 14 Recharts panels (interactive, responsive)
- CLI: `ft viz` (ANSI terminal version)
- Panels include: publication rhythm (area chart), post weekdays (radar), posting hours (bar), top authors, where links lead, categories, domains, hidden gems, time capsules, rising voices
- Why it matters: gives insight into your bookmarking habits and content patterns at a glance

#### 6.4 Bulk Delete from X
- New in v2.0.0
- GUI: Browse screen → multi-select bookmarks → "Remove from X" button
- Also available as a post-sync option: "Remove from X after sync" checkbox in the Sync screen
- Uses the same browser-cookie authentication as sync — no OAuth re-auth needed
- Rate-limited to 250ms between requests to avoid triggering X's rate limits
- Local copy is always kept — only the X bookmark list is cleaned up
- Why it matters: lets you use X bookmarks as a processing queue — save, sync, then clear the queue

#### 6.5 Reset Classification
- New in v2.0.0
- GUI: multi-select in Browse → "Reset classification"; or Classify screen → "Reset all first"
- CLI: `resetClassification()` available programmatically
- Clears categories, primary category, domains from the SQLite DB
- Next classify run re-processes the reset bookmarks from scratch
- Why it matters: run a fresh classify with a new engine or after improving your prompts without rebuilding the whole index

#### 6.6 Agent Integration
- Because all data is local and accessible via CLI, any AI agent with shell access can query it
- Install the skill: `ft skill install` (auto-detects Claude Code and Codex)
- Example prompts: "What have I bookmarked about Rust performance in the last year?" / "Find the best open-source AI memory tools I saved"
- Why it matters: your bookmark library becomes a queryable second brain

#### 6.7 Local-First Storage
- `~/.fieldtheory/bookmarks/` — no cloud, no account, no subscription
- `bookmarks.jsonl` is the canonical source; the SQLite index is rebuilt from it at any time
- Delete everything: `rm -rf ~/.fieldtheory/bookmarks`
- Why it matters: full ownership, no vendor lock-in, works offline

---

### Section 7 — Where Are My Saved Bookmarks on Twitter? {#7}

**Purpose:** FAQ answer + pivot to local access.

**Talking points:**
- On X, bookmarks live at `x.com/i/bookmarks` — server-side only
- Not included in X's data archive download
- FT GUI mirrors them to `~/.fieldtheory/bookmarks/bookmarks.jsonl`
- Browse and search them in the GUI's Browse and Search screens, or with `ft list` and `ft show <id>` in the CLI

**Keywords:** `Where are my saved bookmarks on Twitter?`

---

### Section 8 — How to Export All Your Twitter Bookmarks {#8}

**Purpose:** Answer the export FAQ with practical steps.

**Talking points:**
- `ft sync --rebuild` fetches the entire history
- Output: `bookmarks.jsonl` — one JSON record per line, portable to any tool
- Can be imported into Google Sheets, Notion, a database, or a custom RAG pipeline
- Use `FT_DATA_DIR` to write the data to a specific export path
- This is currently the most complete free export option for X/Twitter bookmarks

**Keywords:** `How do I transfer all Twitter bookmarks?`, `twitter bookmarks exporter`

---

### Section 9 — How to Delete Twitter Bookmarks in Bulk {#9}

**Purpose:** New section — addresses a real user need and a keyword that wasn't in the original brief.

**Talking points:**
- X has no native "select all and delete" or bulk-remove feature
- FT GUI's Browse screen supports multi-select; "Remove from X" calls X's internal `DeleteBookmark` mutation
- The "Remove from X after sync" option in the Sync screen automates the workflow: sync → keep locally → clear from X
- Useful for treating bookmarks as a processing queue
- Rate-limited to avoid triggering X's API limits; a progress counter shows status
- Local copy is always preserved — this is unbookmarking on X, not deletion from your local library

**Keywords:** `How do I delete all my Twitter bookmarks?`, `delete twitter bookmarks`

---

### Section 10 — Scheduling Automatic Syncs {#10}

**Purpose:** Power-user workflow. Short section.

```bash
# Sync every morning at 7am
0 7 * * * ft sync

# Sync, classify, and remove from X every morning
0 7 * * * ft sync --classify
```

- Combined with agent integration, this is a fully automated personal knowledge pipeline
- On macOS: `ft possible nightly install` sets up a LaunchAgent for nightly Possible runs

---

### Section 11 — Is FT GUI Safe to Use? {#11}

**Purpose:** Address the security concern directly.

**Talking points:**
- The app reads browser cookies from local disk — legitimate concern to address head-on
- Cookies are used only for the sync/delete request and are discarded; never stored to any file
- All network requests go only to X's API — no third-party endpoints
- No telemetry, no analytics, nothing phoned home
- The GUI renderer runs with Electron context isolation — it has no direct Node.js access
- OAuth tokens stored `chmod 600` (owner-only)
- Fully open source: [github.com/afar1/fieldtheory-cli](https://github.com/afar1/fieldtheory-cli)

---

### Section 12 — Frequently Asked Questions {#12}

Write direct 2–4 sentence answers for each:

1. **Can you download your Twitter bookmarks?**
2. **Is there a desktop app for Twitter bookmarks?**
3. **How do I delete all my Twitter bookmarks at once?**
4. **Where are my saved bookmarks on Twitter?**
5. **How do I export all my bookmarks from X?**
6. **Does it require an X/Twitter API key?**
7. **Does it work on Windows and Linux?**
8. **Is FT GUI free?**

---

### Section 13 — Conclusion {#13}

**Talking points:**
- X bookmarks are too valuable to leave in a locked, unsearchable silo
- FT GUI gives you a local desktop app backed by a proven CLI — sync, search, classify, delete, and automate
- Built on the original fieldtheory-cli (open source, MIT)
- CTA: download the AppImage/deb/dmg/exe from GitHub Releases, or install the CLI via npm
- Link to: https://github.com/afar1/fieldtheory-cli

---

## Writing Style Rules

- Use H2 for main sections, H3 for subsections
- Code blocks for all CLI commands and paths
- Keep paragraphs short — 3 sentences max
- No marketing fluff — be direct and specific
- Link to the GitHub repo at least twice
- Use "X" and "Twitter" interchangeably
- "FT GUI" is the desktop app name; "ft" is the CLI command; "fieldtheory-cli" is the original repo/package name

---

*Brief for: FT GUI v2.0.0 blog post | Keywords: twitter bookmarks manager, twitter bookmarks exporter, export twitter bookmarks free, download twitter bookmarks, delete twitter bookmarks, twitter bookmarks desktop app*
