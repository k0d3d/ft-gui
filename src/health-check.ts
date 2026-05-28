import fs from 'node:fs';
import { twitterBookmarksCachePath, twitterBookmarksIndexPath, dataDir } from './paths.js';
import { openDb } from './db.js';
import { detectValidSessions } from './graphql-bookmarks.js';
import { loadPreferences, savePreferences } from './preferences.js';
import { DELETE_BOOKMARK_OPERATION_NAME } from './bookmark-delete.js';

const X_PUBLIC_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';
const BOOKMARKS_QID = 'Z9GWmP0kP2dajyckAaDUBw';

export type CheckStatus = 'ok' | 'warn' | 'error' | 'skip';

export interface CheckResult {
  id: string;
  name: string;
  category: 'local' | 'session' | 'api';
  status: CheckStatus;
  detail: string;
  fix?: string;
  /** When true, the health runner can auto-fix this check and re-run. */
  autofixable?: boolean;
}

export interface HealthReport {
  checks: CheckResult[];
  ranAt: string;
  critical: boolean; // true if any check is 'error'
}

// ── Individual checks ─────────────────────────────────────────────────────────

function checkDataDir(): CheckResult {
  const base: Omit<CheckResult, 'status' | 'detail'> = {
    id: 'local.data_dir',
    name: 'Data directory',
    category: 'local',
  };
  try {
    const dir = dataDir();
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    return { ...base, status: 'ok', detail: dir };
  } catch (e) {
    return { ...base, status: 'error', detail: String(e), fix: 'Check permissions on ~/.fieldtheory/bookmarks' };
  }
}

function checkJsonl(): CheckResult {
  const base: Omit<CheckResult, 'status' | 'detail'> = {
    id: 'local.jsonl',
    name: 'Bookmark cache (JSONL)',
    category: 'local',
  };
  try {
    const p = twitterBookmarksCachePath();
    const stat = fs.statSync(p);
    const lines = fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).length;
    return { ...base, status: lines > 0 ? 'ok' : 'warn', detail: `${lines.toLocaleString()} records · ${(stat.size / 1024 / 1024).toFixed(1)} MB` };
  } catch {
    return { ...base, status: 'warn', detail: 'bookmarks.jsonl not found — run Sync first', fix: 'Go to Sync screen and pull your bookmarks' };
  }
}

async function checkDb(): Promise<CheckResult> {
  const base: Omit<CheckResult, 'status' | 'detail'> = {
    id: 'local.db',
    name: 'SQLite search index',
    category: 'local',
  };
  try {
    const db = await openDb(twitterBookmarksIndexPath());
    const count = db.exec('SELECT COUNT(*) FROM bookmarks')[0]?.values[0]?.[0] as number ?? 0;
    // Verify FTS works
    db.exec('SELECT * FROM bookmarks_fts LIMIT 1');
    db.close();
    return { ...base, status: 'ok', detail: `${count.toLocaleString()} bookmarks · FTS index healthy` };
  } catch (e) {
    const msg = String(e);
    return {
      ...base,
      status: 'error',
      detail: msg,
      fix: 'Go to Settings → Rebuild index',
    };
  }
}

async function checkSession(): Promise<CheckResult & { session?: Awaited<ReturnType<typeof detectValidSessions>>[0] }> {
  const base: Omit<CheckResult, 'status' | 'detail'> = {
    id: 'session.browser',
    name: 'Browser session (X auth)',
    category: 'session',
  };
  try {
    const sessions = await detectValidSessions();
    if (!sessions.length) {
      return { ...base, status: 'error', detail: 'No session found', fix: 'Open x.com in Chrome, Brave, or Firefox and log in' };
    }
    const s = sessions[0];
    const name = s.browser.displayName ?? s.browser.id;
    return { ...base, status: 'ok', detail: `${name} · csrf=${s.csrfToken.slice(0, 8)}…`, session: s };
  } catch (e) {
    return { ...base, status: 'error', detail: String(e), fix: 'Open x.com in a supported browser' };
  }
}

async function checkBookmarksRead(session: Awaited<ReturnType<typeof detectValidSessions>>[0] | undefined): Promise<CheckResult> {
  const base: Omit<CheckResult, 'status' | 'detail'> = {
    id: 'api.bookmarks_read',
    name: 'Bookmarks read (GraphQL)',
    category: 'api',
  };
  if (!session) return { ...base, status: 'skip', detail: 'Skipped — no browser session' };

  const headers = {
    authorization: `Bearer ${X_PUBLIC_BEARER}`,
    'x-csrf-token': session.csrfToken,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json',
    'user-agent': CHROME_UA,
    cookie: session.cookieHeader,
  };

  const features = encodeURIComponent(JSON.stringify({ graphql_timeline_v2_bookmark_timeline: true, responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, creator_subscriptions_tweet_preview_api_enabled: true, responsive_web_graphql_timeline_navigation_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false }));
  const variables = encodeURIComponent(JSON.stringify({ count: 1 }));
  const url = `https://x.com/i/api/graphql/${BOOKMARKS_QID}/Bookmarks?variables=${variables}&features=${features}`;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      return { ...base, status: 'ok', detail: `HTTP ${res.status} — endpoint reachable` };
    }
    const body = await res.text().catch(() => '');
    return {
      ...base,
      status: res.status === 401 || res.status === 403 ? 'error' : 'warn',
      detail: `HTTP ${res.status} · ${body.slice(0, 120)}`,
      fix: res.status === 401 ? 'Session expired — open x.com in your browser and refresh' : undefined,
    };
  } catch (e) {
    return { ...base, status: 'error', detail: `Network error: ${String(e)}`, fix: 'Check internet connection' };
  }
}

async function checkBookmarkDelete(session: Awaited<ReturnType<typeof detectValidSessions>>[0] | undefined): Promise<CheckResult> {
  const base: Omit<CheckResult, 'status' | 'detail'> = {
    id: 'api.bookmark_delete',
    name: 'Bookmark delete (GraphQL)',
    category: 'api',
  };
  if (!session) return { ...base, status: 'skip', detail: 'Skipped — no browser session' };

  const prefs = loadPreferences();
  const qid = prefs.deleteBookmarkQueryId ?? 'Wlmlj2-xzyS1GN3a6cj-mQ';
  const headers = {
    authorization: `Bearer ${X_PUBLIC_BEARER}`,
    'x-csrf-token': session.csrfToken,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json',
    'user-agent': CHROME_UA,
    cookie: session.cookieHeader,
  };

  try {
    // Use tweet_id "1" — X returns "Done" for any ID (idempotent), so no real bookmark is deleted
    const body = JSON.stringify({ variables: { tweet_id: '1' }, queryId: qid });
    const url = `https://x.com/i/api/graphql/${qid}/${DELETE_BOOKMARK_OPERATION_NAME}`;
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
    const text = await res.text();

    if (res.ok && text.includes('Done')) {
      const source = prefs.deleteBookmarkQueryId ? 'auto-updated queryId' : 'hardcoded queryId';
      return { ...base, status: 'ok', detail: `HTTP ${res.status} · queryId valid (${source})` };
    }

    if (text.includes('Query not found') || res.status === 404) {
      return {
        ...base,
        status: 'error',
        detail: `queryId "${qid}" no longer valid — X has rotated it`,
        fix: 'Click "Auto-update queryId" to fetch the new one from X\'s live bundle',
        autofixable: true,
      };
    }

    return { ...base, status: 'warn', detail: `HTTP ${res.status} · ${text.slice(0, 150)}` };
  } catch (e) {
    return { ...base, status: 'error', detail: `Network error: ${String(e)}`, fix: 'Check internet connection' };
  }
}

// ── Auto-heal: discover new queryId from X's JS bundle ───────────────────────

export async function autoHealDeleteQueryId(): Promise<{ found: boolean; queryId?: string; error?: string }> {
  try {
    const homeRes = await fetch('https://x.com/', {
      headers: { 'user-agent': CHROME_UA, accept: 'text/html' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await homeRes.text();

    const bundleMatch =
      html.match(/https:\/\/abs\.twimg\.com\/responsive-web\/client-web\/main\.[a-z0-9]+\.js/) ??
      html.match(/\/responsive-web\/client-web\/main\.[a-z0-9]+\.js/);

    if (!bundleMatch) return { found: false, error: 'Could not locate main JS bundle URL in x.com HTML' };

    const bundleUrl = bundleMatch[0].startsWith('http')
      ? bundleMatch[0]
      : `https://abs.twimg.com${bundleMatch[0]}`;

    const bundleRes = await fetch(bundleUrl, { headers: { 'user-agent': CHROME_UA }, signal: AbortSignal.timeout(30000) });
    if (!bundleRes.ok) return { found: false, error: `Bundle fetch failed: HTTP ${bundleRes.status}` };

    const reader = bundleRes.body!.getReader();
    const decoder = new TextDecoder();
    const OVERLAP = 300;
    let buffer = '';
    let found: string | null = null;

    const PATTERNS = [
      /queryId:"([A-Za-z0-9_-]{20,30})",operationName:"DeleteBookmark"/,
      /id:"([A-Za-z0-9_-]{20,30})",operationName:"DeleteBookmark"/,
      /operationName:"DeleteBookmark"[^}]{0,200}queryId:"([A-Za-z0-9_-]{20,30})"/,
    ];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = buffer.slice(-OVERLAP) + decoder.decode(value, { stream: true });
      for (const pat of PATTERNS) {
        const m = buffer.match(pat);
        if (m) { found = m[1]; break; }
      }
      if (found) break;
    }
    reader.cancel().catch(() => {});

    if (!found) return { found: false, error: 'DeleteBookmark not found in bundle — X may have changed their bundle format' };

    // Persist to preferences so bookmark-delete.ts picks it up immediately
    const prefs = loadPreferences();
    savePreferences({ ...prefs, deleteBookmarkQueryId: found });

    return { found: true, queryId: found };
  } catch (e) {
    return { found: false, error: String(e) };
  }
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runHealthChecks(): Promise<HealthReport> {
  const sessionResult = await checkSession();
  const session = (sessionResult as any).session;

  const checks: CheckResult[] = await Promise.all([
    Promise.resolve(checkDataDir()),
    Promise.resolve(checkJsonl()),
    checkDb(),
    Promise.resolve(sessionResult),
    checkBookmarksRead(session),
    checkBookmarkDelete(session),
  ]);

  return {
    checks,
    ranAt: new Date().toISOString(),
    critical: checks.some((c) => c.status === 'error'),
  };
}
