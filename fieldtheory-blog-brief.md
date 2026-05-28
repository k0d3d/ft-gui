# ✍️ Blog Writing Brief: fieldtheory-cli

> **For the writing AI agent.** Follow every section in order. Each section includes its purpose, the angle to take, keywords to weave in naturally, and specific talking points to cover. Do not invent technical details — only use what is provided in this brief. Write in a clear, practical, developer-friendly tone. Avoid fluff.

---

## Meta / SEO Header

| Field | Value |
|---|---|
| **Suggested Title** | How to Export and Manage Your Twitter Bookmarks Locally with fieldtheory-cli |
| **Meta Description** | fieldtheory-cli is a free, open-source CLI tool that lets you download, search, classify, and organize all your Twitter/X bookmarks locally — no API key required. |
| **Primary Keyword** | twitter bookmarks exporter |
| **Secondary Keywords** | twitter bookmarks manager, export twitter bookmarks free, download twitter bookmarks, twitter bookmarks save and organize |
| **FAQ Keywords (use as H2/H3 subheadings)** | Can you download your Twitter bookmarks? · Where are my saved bookmarks on Twitter? · How do I transfer all Twitter bookmarks? · How can I export all my bookmarks? |
| **Target Audience** | Developers, power users, researchers, and anyone who uses X/Twitter bookmarks heavily and wants offline access or smarter organization |
| **Tone** | Practical, honest, informative. First-person where appropriate (author troubleshot this tool themselves). |
| **Word Count Target** | 1,800 – 2,400 words |

---

## Table of Contents

The agent must write content for all sections below and render a linked ToC near the top of the article.

1. [Introduction: The Bookmark Problem Nobody Talks About](#1)
2. [Can You Download Your Twitter Bookmarks?](#2)
3. [What is fieldtheory-cli?](#3)
4. [How fieldtheory-cli Works Under the Hood](#4)
5. [Getting Started: Installation and First Sync](#5)
6. [Core Features and Why They Matter](#6)
   - 6.1 Full-Text Search with BM25 Ranking
   - 6.2 LLM-Powered Classification
   - 6.3 Terminal Dashboard (`ft viz`)
   - 6.4 Agent Integration (Claude Code, Codex, etc.)
   - 6.5 Local-First Data Storage
   - 6.6 OAuth / Cross-Platform Fallback
7. [Where Are My Saved Bookmarks on Twitter? (And What fieldtheory Does with Them)](#7)
8. [How to Transfer or Export All Your Twitter Bookmarks](#8)
9. [Scheduling Automatic Syncs](#9)
10. [Bugs I Found and Fixed (Real-World Troubleshooting)](#10)
11. [Is fieldtheory-cli Safe to Use?](#11)
12. [Frequently Asked Questions](#12)
13. [Conclusion](#13)

---

## Section Writing Instructions

---

### Section 1 — Introduction: The Bookmark Problem Nobody Talks About {#1}

**Purpose:** Hook the reader with a relatable pain point. Establish why this tool matters before introducing it.

**Angle:** Twitter/X bookmarks are a graveyard of good ideas. They have no folders, no search, no export, and no memory. Users save tweets and never find them again.

**Talking points:**
- Twitter bookmarks are siloed — no native export, no way to search across hundreds of saves
- X Premium (paid) users get folders, but free users get a flat, unsearchable list
- People use bookmarks as a personal knowledge base — and the tool fails them
- Segue: "That's exactly the gap fieldtheory-cli was built to fill"

**Keywords to include:** `twitter bookmarks manager`, `twitter bookmarks save and organize`

---

### Section 2 — Can You Download Your Twitter Bookmarks? {#2}

**Purpose:** Directly answer a high-intent FAQ search query. This section should be scannable and rank for the question.

**Angle:** Twitter does not offer an official export for bookmarks. But there are workarounds — and fieldtheory-cli is the most powerful free one.

**Talking points:**
- Twitter/X has no native "Export Bookmarks" button (as of writing)
- X's data export (`Settings → Download an archive`) does NOT include bookmarks
- Paid third-party tools exist but cost money and require API access
- fieldtheory-cli solves this for free, using your existing Chrome session — no API key needed
- Answer the question directly: Yes, you can download your Twitter bookmarks — with the right tool

**Keywords to include:** `Can you download your Twitter bookmarks?`, `export twitter bookmarks free`, `download twitter bookmarks`

---

### Section 3 — What is fieldtheory-cli? {#3}

**Purpose:** Introduce the tool clearly and factually.

**Angle:** Short, punchy overview. Let the tool speak for itself.

**Talking points:**
- fieldtheory-cli (`ft`) is a free, open-source command-line tool
- It syncs and stores all your X/Twitter bookmarks locally on your machine
- Built for Mac natively; Linux and Windows supported via OAuth mode
- Written in TypeScript, installable via npm in one command
- Designed by the original author (@afar1) to be agent-friendly — works with Claude Code, Codex, or any shell-access AI agent
- Link: https://github.com/afar1/fieldtheory-cli

**Keywords to include:** `twitter bookmarks exporter`, `export twitter bookmarks free`

---

### Section 4 — How fieldtheory-cli Works Under the Hood {#4}

**Purpose:** Explain the technical mechanism in plain language. This is the "how it works" section the brief specifically requested.

**Angle:** Demystify the tool without being overwhelming. Readers want to understand what's happening when they run `ft sync`.

**Talking points to cover in this section:**

#### Chrome Session Extraction
- On first run, `ft sync` reads your locally stored Chrome cookies (from Chrome's local database on disk)
- It extracts your X/Twitter session token — the same one your browser uses when you're logged in
- The session cookie is used only for the sync request and is **never stored separately** — it is discarded after use
- This is why you need Google Chrome installed and logged into X

#### X's Internal GraphQL API
- fieldtheory-cli doesn't use the official X Developer API (which requires paid access for bookmark reads)
- Instead, it uses X's **internal GraphQL API** — the same one that runs when you scroll through your bookmarks in the browser
- This is why no API key or developer account is required
- Optional: OAuth mode (`ft auth` + `ft sync --api`) uses the official v2 API for cross-platform use

#### Local Data Pipeline
- Fetched bookmarks are saved as `bookmarks.jsonl` (one JSON object per line)
- An SQLite FTS5 (Full-Text Search 5) index is built at `bookmarks.db`
- Sync metadata is tracked in `bookmarks-meta.json`
- All data lands in `~/.ft-bookmarks/` — fully local, nothing sent to a server

#### Incremental vs Full Sync
- Default `ft sync` is incremental — only fetches new bookmarks since the last run
- `ft sync --full` crawls the entire bookmark history from scratch

**Keywords to include:** `download twitter bookmarks`, `How can I export all my bookmarks?`

---

### Section 5 — Getting Started: Installation and First Sync {#5}

**Purpose:** Step-by-step onboarding guide. Should feel like a tutorial.

**Requirements to state clearly:**
- Node.js 20 or higher
- Google Chrome (logged into X/Twitter)
- macOS (for Chrome session sync mode)

**Steps to walk through:**
```
npm install -g fieldtheory
ft sync
ft search "your topic"
ft viz
ft categories
```

**Talking points:**
- The first `ft sync` may take a minute depending on how many bookmarks you have
- All data lands in `~/.ft-bookmarks/` — explain what each file is
- Mention `ft status` to check sync state
- Mention `FT_DATA_DIR` env variable for custom storage path

---

### Section 6 — Core Features and Why They Matter {#6}

**Purpose:** The meaty "features" section. Each subsection covers one feature, explains what it does, and argues why it's useful.

---

#### 6.1 Full-Text Search with BM25 Ranking

- Command: `ft search "distributed systems"`
- Uses SQLite FTS5 with BM25 ranking — the same algorithm used by search engines to rank relevance
- Search across hundreds or thousands of bookmarks instantly, locally
- Why it matters: Twitter's native search can't search *your bookmarks specifically*. This gives you a personal, offline search engine over your saved tweets.

---

#### 6.2 LLM-Powered Classification (`ft classify`)

- Command: `ft classify` or `ft sync --classify`
- Sends bookmark text to a local or connected LLM to categorize each one
- Built-in categories: `tool`, `security`, `technique`, `launch`, `research`, `opinion`, `commerce`
- Regex fallback available: `ft classify --regex` for lightweight classification without an LLM
- `ft categories` shows distribution; `ft domains` shows subject domain breakdown
- Why it matters: Transforms a flat list of saved tweets into an organized knowledge library

---

#### 6.3 Terminal Dashboard (`ft viz`)

- Command: `ft viz`
- Renders an in-terminal dashboard with sparklines, category breakdowns, and domain stats
- No browser, no app — pure terminal visualization
- Why it matters: Gives instant visual insight into your bookmarking habits and content patterns

---

#### 6.4 Agent Integration (Claude Code, Codex, etc.)

- fieldtheory is explicitly designed to work with AI coding agents
- Because all data is local and accessible via CLI, any agent with shell access can query it
- Example prompts to include (from the README):
  - *"What have I bookmarked about cancer research in the last three years?"*
  - *"I bookmarked several open source AI memory tools. Pick the best one and incorporate it."*
  - *"Every day, sync any new X bookmarks using the Field Theory CLI."*
- Why it matters: Your bookmarks become a queryable second brain that AI agents can read, search, and reason over

---

#### 6.5 Local-First Data Storage

- All data is stored at `~/.ft-bookmarks/` — no cloud, no account, no third-party sync
- Files: `bookmarks.jsonl`, `bookmarks.db`, `bookmarks-meta.json`
- No telemetry, no analytics, nothing sent home
- Delete everything cleanly: `rm -rf ~/.ft-bookmarks`
- Why it matters: Full ownership of your data. No vendor lock-in, no subscription, no privacy trade-off

---

#### 6.6 OAuth / Cross-Platform Fallback (`ft sync --api`)

- Chrome session sync is macOS-only (uses macOS Keychain)
- Linux and Windows users: run `ft auth` to set up OAuth, then `ft sync --api`
- Uses official X v2 API in this mode
- Why it matters: The tool isn't Mac-only — it just has a simpler default flow on Mac

---

### Section 7 — Where Are My Saved Bookmarks on Twitter? {#7}

**Purpose:** Answer the FAQ directly, then pivot to how fieldtheory surfaces them locally.

**Talking points:**
- On Twitter/X, bookmarks live at `twitter.com/i/bookmarks` — accessible from the left sidebar (or hamburger menu on mobile)
- They're stored server-side on X's infrastructure — not on your device
- You cannot access them via X's data archive download
- With fieldtheory-cli, a local copy is maintained at `~/.ft-bookmarks/bookmarks.jsonl` — now *you* control the data
- `ft list` and `ft show <id>` let you browse and inspect individual entries

**Keywords to include:** `Where are my saved bookmarks on Twitter?`, `twitter bookmarks save and organize`

---

### Section 8 — How to Transfer or Export All Your Twitter Bookmarks {#8}

**Purpose:** Directly answer the transfer/export FAQ. Practical guidance.

**Angle:** fieldtheory is currently the best free tool for this. Walk through the process.

**Talking points:**
- Twitter has no official export — this is a real gap
- fieldtheory gives you `bookmarks.jsonl` — a standard, portable format (one JSON per line)
- From there, you can: pipe it to a spreadsheet, load it into a database, feed it to an LLM, or back it up to another machine
- `ft sync --full` ensures you get the entire history, not just recent bookmarks
- Mention `FT_DATA_DIR` for exporting to a specific path
- For users migrating platforms or archiving: this is currently the most complete free option

**Keywords to include:** `How do I transfer all Twitter bookmarks?`, `How can I export all my bookmarks?`, `twitter bookmarks exporter`

---

### Section 9 — Scheduling Automatic Syncs {#9}

**Purpose:** Show the power-user workflow. Short section.

**Talking points:**
- Use cron on Mac/Linux to schedule syncs
- Example cron jobs (from README):
  ```
  # Sync every morning at 7am
  0 7 * * * ft sync

  # Sync and classify every morning
  0 7 * * * ft sync --classify
  ```
- Combined with agent integration, you can build a fully automated personal knowledge pipeline
- "Set it and forget it" — your bookmark archive grows automatically

---

### Section 10 — Bugs I Found and Fixed (Real-World Troubleshooting) {#10}

**Purpose:** Establish the author's credibility and make the post unique. This is the personal angle that differentiates this from a generic tool review.

**Instructions for the writing agent:**
- The author (you) cloned the original repo and ran into bugs while using it
- You debugged, traced the issues, and made fixes/improvements
- **Do not invent specific bug details** — the author should fill in the actual specifics here
- Write this section as a placeholder frame:
  - Open with: "When I first ran `ft sync`, I hit [AUTHOR: describe the bug here]..."
  - Describe the investigation process (what error message appeared, where you looked)
  - Describe the fix or workaround
  - Close with: what the experience taught you about how the tool works internally
- Tone: candid, developer-to-developer. This is not a sales section — it's honest experience.

> **[AUTHOR NOTE: Fill in the specific bugs and fixes you made in this section before publishing.]**

---

### Section 11 — Is fieldtheory-cli Safe to Use? {#11}

**Purpose:** Address the obvious security concern: "does this tool steal my Twitter cookies?"

**Talking points:**
- The tool reads Chrome's local cookie database — this is a legitimate concern worth addressing head-on
- Key facts from the source:
  - Cookies are read locally from your machine, never transmitted to a third party
  - The session cookie is used only for the sync request, then discarded — it is never stored in any file
  - All network requests go only to X's API during sync — no other outbound connections
  - No telemetry, no analytics, nothing phoned home
  - OAuth tokens (if used) are stored with `chmod 600` — owner-only file permissions
  - Fully open source — anyone can audit the code at https://github.com/afar1/fieldtheory-cli
- Recommended: review the source before running if you're security-conscious — it's a small, readable codebase

---

### Section 12 — Frequently Asked Questions {#12}

**Purpose:** Structured FAQ block for SEO. Each question should have a direct, 2–4 sentence answer.

Write clear answers for each:

1. **Can you download your Twitter bookmarks?**
   → Yes, using fieldtheory-cli. It extracts your Chrome session and syncs all bookmarks locally as JSON. No API key required.

2. **Where are my saved bookmarks on Twitter?**
   → They live at `twitter.com/i/bookmarks` and are stored on X's servers. fieldtheory-cli creates a local copy at `~/.ft-bookmarks/`.

3. **How do I transfer all Twitter bookmarks?**
   → Run `ft sync --full` to get your complete history, then copy or use `FT_DATA_DIR` to move the data folder anywhere.

4. **How can I export all my bookmarks?**
   → fieldtheory-cli exports them as `bookmarks.jsonl` — a portable JSON Lines file you can open in any editor, database, or script.

5. **Is fieldtheory-cli free?**
   → Yes. It's fully open source under the MIT license.

6. **Does fieldtheory work on Windows or Linux?**
   → Yes, via OAuth mode (`ft auth` + `ft sync --api`). The default Chrome session sync is macOS-only.

7. **Does it require an X/Twitter API key?**
   → No. The default sync uses X's internal API via your browser session — no developer account needed.

---

### Section 13 — Conclusion {#13}

**Purpose:** Wrap up with a clear takeaway and CTA.

**Talking points:**
- Twitter bookmarks are more valuable than the platform lets you treat them
- fieldtheory-cli turns a locked, unsearchable list into a searchable, classifiable, agent-accessible local database
- It's free, open source, and respects your data
- End with a call to action: star the repo, try the install, or share the post
- Optional personal close: mention that after fixing the bugs and spending time with the codebase, you now run `ft sync --classify` on a cron — and actually find your bookmarks again

---

## Writing Style Rules (for the agent)

- Use H2 for main sections, H3 for subsections
- Code blocks for all CLI commands
- Keep paragraphs short — 3 sentences max where possible
- No marketing fluff ("game-changing", "revolutionary") — be direct
- Link to the GitHub repo at least twice: once in Section 3 and once in Section 11
- Do not fabricate benchmark numbers or performance claims
- Use "X" and "Twitter" interchangeably — both are understood by the audience
- The `[AUTHOR NOTE]` placeholder in Section 10 must be preserved for the human author to fill in

---

*Brief prepared for: fieldtheory-cli blog post | Keywords: twitter bookmarks manager, twitter bookmarks exporter, export twitter bookmarks free, download twitter bookmarks, twitter bookmarks save and organize*
