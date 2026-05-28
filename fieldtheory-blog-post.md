# How to Export and Manage Your Twitter Bookmarks Locally with fieldtheory-cli

Twitter bookmarks are where good ideas go to die. We’ve all been there: you see a brilliant thread on distributed systems, a new AI research paper, or a clever CSS trick. You hit "Save," promising yourself you'll read it later. Fast forward three months, and that bookmark is buried under five hundred other "saves" in a flat, unsearchable list that offers no folders (for free users) and zero export options.

If you’re a developer, researcher, or power user, this is a major problem. Your bookmarks are essentially a personal knowledge base, yet the platform treats them like a siloed graveyard.

That’s exactly the gap **fieldtheory-cli** was built to fill. It’s a free, open-source tool that lets you take ownership of your data, bringing your bookmarks into a local, searchable, and classifiable database on your own machine.

---

## Table of Contents

1. [Introduction: The Bookmark Problem Nobody Talks About](#1)
2. [Can You Download Your Twitter Bookmarks?](#2)
3. [What is fieldtheory-cli?](#3)
4. [How fieldtheory-cli Works Under the Hood](#4)
5. [Getting Started: Installation and First Sync](#5)
6. [Core Features and Why They Matter](#6)
7. [Where Are My Saved Bookmarks on Twitter? (And What fieldtheory Does with Them)](#7)
8. [How to Transfer or Export All Your Twitter Bookmarks](#8)
9. [Scheduling Automatic Syncs](#9)
10. [Bugs I Found and Fixed (Real-World Troubleshooting)](#10)
11. [Is fieldtheory-cli Safe to Use?](#11)
12. [Frequently Asked Questions](#12)
13. [Conclusion](#13)

---

## 1. Introduction: The Bookmark Problem Nobody Talks About {#1}

The internet is moving faster than ever, and X (formerly Twitter) remains the primary firehose for real-time information. But as a **twitter bookmarks manager**, the native app is fundamentally broken. 

Unless you pay for X Premium, you don't even get basic folder organization. Even then, the "search" function within bookmarks is notoriously unreliable, often failing to find keywords that are clearly visible on the screen. There is no way to export your list to a spreadsheet, no way to run complex queries, and no way to access your "saved" knowledge if you're offline.

We use bookmarks to build a "second brain," but X provides us with a tool that has no memory. fieldtheory-cli was designed to solve this by treating your bookmarks as **data**—something that should be local, searchable, and yours to keep.

---

## 2. Can You Download Your Twitter Bookmarks? {#2}

If you’ve ever tried to **download twitter bookmarks** using the official "Download an archive of your data" tool in X’s settings, you’ve likely been disappointed. 

The standard X data export includes your tweets, your likes, and your direct messages—but as of early 2026, it **does not include your bookmarks**. This is a bizarre omission that leaves users locked into the platform. 

So, **how can I export all my bookmarks?** While there are paid third-party SaaS tools that charge a monthly fee to manage your saves, **fieldtheory-cli** is the most powerful way to **export twitter bookmarks free**. It bypasses the need for an expensive developer API account by leveraging your existing browser session to sync data directly to your local drive.

---

## 3. What is fieldtheory-cli? {#3}

**fieldtheory-cli** (`ft`) is a free, open-source command-line tool built for power users. It syncs, stores, and organizes all your X/Twitter bookmarks locally on your machine.

*   **Open Source:** MIT licensed and fully transparent.
*   **Local First:** Your data never leaves your machine.
*   **Developer Friendly:** Written in TypeScript and installable via `pnpm` or `npm`.
*   **Agent Optimized:** Designed to be used by AI agents like Claude Code or Codex to answer questions about your saved knowledge.

You can find the project on GitHub here: [https://github.com/afar1/fieldtheory-cli](https://github.com/afar1/fieldtheory-cli)

---

## 4. How fieldtheory-cli Works Under the Hood {#4}

Most tools that interact with X require you to set up a Developer Account and pay for API access. `fieldtheory-cli` takes a different, more clever approach.

### Chrome Session Extraction
When you run `ft sync`, the tool looks for your local browser configuration (supporting Chrome, Brave, Chromium, Edge, and Firefox). It reads the encrypted cookie database stored on your hard drive to find your active X/Twitter session token. This is the exact same token your browser uses to keep you logged in.

### X’s Internal GraphQL API
Instead of the official (and limited) v2 API, the tool uses X’s internal GraphQL endpoints. This is the same API that powers the actual Twitter web app. Because it uses your existing session, it doesn't need a separate API key. 

### Local Data Pipeline
Once the data is fetched, it follows a clean pipeline:
1.  **Raw Cache:** Saved as `bookmarks.jsonl` (JSON Lines format).
2.  **Search Index:** A high-performance SQLite FTS5 index is built at `bookmarks.db`.
3.  **Metadata:** Sync progress is tracked in `bookmarks-meta.json`.

Everything is stored in `~/.fieldtheory/bookmarks/` (or `~/.ft-bookmarks/` for legacy installs). It’s completely private and requires no cloud connection.

---

## 5. Getting Started: Installation and First Sync {#5}

The installation is straightforward for anyone comfortable with a terminal.

**Requirements:**
*   Node.js 20 or higher.
*   A browser logged into X.com (Chrome, Brave, Firefox, etc.).
*   Linux, macOS, or Windows.

**The Setup:**

```bash
# Install the CLI globally
pnpm install -g fieldtheory

# Sync your bookmarks
ft sync

# Search for something you saved months ago
ft search "raft consensus"

# See your data visualization
ft viz

# Check your categories
ft categories
```

On your first run, `ft sync` will automatically detect your browser. If it finds multiple browsers with sessions, it will now (thanks to recent updates) ask you which one you want to use.

---

## 6. Core Features and Why They Matter {#6}

### 6.1 Full-Text Search with BM25 Ranking
Command: `ft search "keyword"`

This isn't a simple "contains" search. It uses the **BM25 (Best Matching 25)** ranking algorithm—the same one used by professional search engines. It ranks results based on term frequency and relevance, allowing you to find that one specific tweet about "Rust performance" even if you have 5,000 bookmarks.

### 6.2 LLM-Powered Classification
Command: `ft classify`

This is where the tool gets "smart." It can send your bookmark text to an LLM (Claude, Codex, or any OpenAI-compatible API via LiteLLM) to automatically categorize them into slugs like `tool`, `technique`, `research`, or `security`. 

### 6.3 Terminal Dashboard (`ft viz`)
Command: `ft viz`

For the data nerds, `ft viz` generates an elegant in-terminal dashboard. It shows your bookmarking volume over time via sparklines and breaks down your "subject domains" (e.g., AI, Finance, Web-Dev) so you can see exactly where your interests lie.

### 6.4 Agent Integration
Because the CLI is fast and the data is local, it is the perfect "second brain" for AI agents. If you use **Claude Code** or **Codex**, you can simply ask:
> *"I bookmarked a few threads about Postgres optimization last month. Can you find them and summarize the key settings I should change?"*

### 6.5 Local-First Data Storage
No cloud accounts. No "Log in with Google." No telemetry. Your data stays on your hardware. If you ever want to delete everything, just `rm -rf ~/.fieldtheory`.

---

## 7. Where Are My Saved Bookmarks on Twitter? {#7}

On the web, your bookmarks are buried at `twitter.com/i/bookmarks`. They are stored exclusively on X’s servers. If X goes down, or if you lose access to your account, those bookmarks are gone.

With `fieldtheory-cli`, your bookmarks live in `~/.fieldtheory/bookmarks/bookmarks.jsonl`. You now have a permanent, portable backup that you can take with you, regardless of what happens to the platform.

---

## 8. How to Transfer or Export All Your Twitter Bookmarks {#8}

**How do I transfer all Twitter bookmarks?** This has historically been a manual "copy-paste" nightmare.

With this CLI, you get a clean `bookmarks.jsonl` file. This is a standard format that can be easily:
*   Imported into a Google Sheet or Excel.
*   Loaded into a Notion database.
*   Fed into a custom RAG (Retrieval-Augmented Generation) pipeline for your personal LLM projects.

Running `ft sync --full` ensures you crawl your entire history, making it the definitive way to **transfer all twitter bookmarks** to a format you actually control.

---

## 9. Scheduling Automatic Syncs {#9}

You don't have to run the sync manually every day. You can set it and forget it using a simple cron job.

```bash
# Sync and classify every morning at 8:00 AM
0 8 * * * ft sync --classify
```

This ensures your local "second brain" is always up to date with your latest discoveries on X.

---

## 10. Bugs I Found and Fixed (Real-World Troubleshooting) {#10}

When I first started using the tool on my Linux machine, I ran into a few "real world" hurdles that taught me a lot about how browser data is handled.

**The "Ghost Directory" Problem:**
When I first ran `ft sync`, it gave me a "browser cannot connect" error. It turned out the CLI was detecting a "ghost" Chrome directory in my `.config` folder that was actually created by another app (1Password), not the actual browser. I submitted a fix that validates the "Local State" of the browser before attempting to use it.

**Snap and Flatpak Support:**
On modern Linux distros (like Ubuntu), browsers like Brave and Firefox are often installed via **Snap**. These browsers don't store their cookies in the standard `~/.config/` path; they hide them inside `~/snap/brave/current/...`. I refactored the detection logic to scan these Snap and Flatpak paths automatically.

**The SQLite Dependency:**
The tool originally had a hard dependency on the system `sqlite3` binary. If you didn't have it installed on your OS, the sync would fail silently. I updated the codebase to leverage the new experimental `node:sqlite` built-in for Node.js 22.5+, providing a much smoother "zero-config" experience for users.

**LiteLLM for Everyone:**
Finally, I added support for **LiteLLM**. While the tool originally focused on `claude` and `codex` CLIs, you can now point it to any OpenAI-compatible API. This makes it incredibly easy to use local models or alternative providers for your bookmark classification.

---

## 11. Is fieldtheory-cli Safe to Use? {#11}

Whenever a tool asks to read your "browser session," you should be cautious. Here is why `fieldtheory-cli` is safe:

1.  **Local Execution:** It reads your cookies from your disk and uses them to talk **only** to X’s official API.
2.  **No Storage:** The session cookie is used for the duration of the sync and is **never saved to a file**.
3.  **No Telemetry:** There are no analytics tracking your usage or sending your tweet data to a third-party server.
4.  **Open Source:** You don't have to take my word for it. You can audit every line of the session extraction logic in `src/chrome-cookies.ts`.

---

## 12. Frequently Asked Questions {#12}

**Can you download your Twitter bookmarks?**
Yes. Use `ft sync` to extract them to a local JSONL file.

**Where are my saved bookmarks on Twitter?**
Server-side at `twitter.com/i/bookmarks`. `fieldtheory-cli` mirrors them to `~/.fieldtheory/bookmarks/`.

**How do I transfer all Twitter bookmarks?**
Run `ft sync --full`, then move the `bookmarks.jsonl` file to your new destination.

**Is fieldtheory-cli free?**
Yes, it is 100% open-source (MIT License).

**Does it work on Windows/Linux?**
Yes. It supports Linux natively (including Snap/Flatpak) and Windows via Node.js 22.5+.

---

## 13. Conclusion {#13}

Your bookmarks are too valuable to be left in a locked silo. By moving your saves to a local-first database, you turn a forgotten list of tweets into a searchable, organized knowledge base that actually works for you.

Whether you're looking for a better **twitter bookmarks manager** or just need a reliable **twitter bookmarks exporter**, `fieldtheory-cli` is the tool you've been waiting for.

Give it a star on GitHub and take control of your data today:
[https://github.com/afar1/fieldtheory-cli](https://github.com/afar1/fieldtheory-cli)
