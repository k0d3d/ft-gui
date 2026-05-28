/**
 * Debug script for "Remove all from X" feature.
 *
 * What it does:
 *   1. Detects your browser session (same mechanism as ft sync)
 *   2. Verifies the session is alive (hits the bookmarks GraphQL endpoint)
 *   3. Loads the latest live bookmark IDs from X
 *   4. Probes the DeleteBookmark mutation with the latest live bookmark
 *   4. Reports whether the query ID is still valid and what X returned
 *
 * If the probe succeeds, pass --all to run the full bulk delete or
 * `--count <n>` to delete only the latest n bookmarks.
 *
 * Usage:
 *   pnpm exec tsx scripts/debug-delete.ts             # probe only (safe)
 *   pnpm exec tsx scripts/debug-delete.ts --count 100 # probe + latest 100
 *   pnpm exec tsx scripts/debug-delete.ts --all       # probe + full bulk delete
 */

import { detectValidSessions } from '../src/graphql-bookmarks.js';
import { deleteXBookmarks, getCurrentBookmarkTweetIds } from '../src/bookmark-delete.js';

const X_PUBLIC_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

// Known DeleteBookmark query IDs (newest first)
const CANDIDATE_QUERY_IDS = [
  'Wlmlj2-xzyS1GN3a6cj-mQ',  // current (found 2026-05-28 from main bundle)
  'Wlmlj2-xzy44Y3-a2VzGig',  // previous
  'ZYKSe-w24f6a21g8SH0SqQ',  // other observed variant
];

function buildHeaders(csrfToken: string, cookieHeader: string) {
  return {
    authorization: `Bearer ${X_PUBLIC_BEARER}`,
    'x-csrf-token': csrfToken,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json',
    'user-agent': CHROME_UA,
    cookie: cookieHeader,
  };
}

// ── 1. Detect session ─────────────────────────────────────────────────────────

console.log('\n[1] Detecting browser session…');
const sessions = await detectValidSessions();

if (!sessions.length) {
  console.error('❌  No session found. Open x.com in Chrome or Firefox, log in, then retry.');
  process.exit(1);
}

const session = sessions[0];
const browserName = session.browser.displayName ?? session.browser.id;
console.log(`✓  ${browserName}  csrf=${session.csrfToken.slice(0, 8)}…  cookie=${session.cookieHeader.length}b`);

const headers = buildHeaders(session.csrfToken, session.cookieHeader);

// ── 2. Verify session via Bookmarks GraphQL (same endpoint as ft sync) ────────

console.log('\n[2] Verifying session (1-item bookmarks query)…');

const BOOKMARKS_QID = 'Z9GWmP0kP2dajyckAaDUBw';
const features = encodeURIComponent(JSON.stringify({
  graphql_timeline_v2_bookmark_timeline: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  tweetypie_unmention_optimization_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: false,
  tweet_awards_web_tipping_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false,
}));
const variables = encodeURIComponent(JSON.stringify({ count: 1 }));
const verifyUrl = `https://x.com/i/api/graphql/${BOOKMARKS_QID}/Bookmarks?variables=${variables}&features=${features}`;

const verifyRes = await fetch(verifyUrl, { headers });
console.log(`   HTTP ${verifyRes.status} ${verifyRes.statusText}`);

if (!verifyRes.ok) {
  const body = await verifyRes.text();
  console.error('❌  Session check failed — token expired or browser not logged in.');
  console.error('   Body:', body.slice(0, 300));
  process.exit(1);
}

const verifyJson = await verifyRes.json() as any;
const timelineEntries = verifyJson?.data?.bookmark_timeline_v2?.timeline?.instructions?.[0]?.entries ?? [];
console.log(`✓  Session valid — ${timelineEntries.length} entry/entries returned from bookmarks endpoint`);

// ── 3. Load live bookmark IDs ─────────────────────────────────────────────────

console.log('\n[3] Loading live bookmark IDs…');
const allIds = await getCurrentBookmarkTweetIds(session);
console.log(`✓  ${allIds.length.toLocaleString()} live bookmarks currently on X`);

if (!allIds.length) {
  console.error('❌  No live bookmarks found on X.');
  process.exit(1);
}

// ── 4. Probe DeleteBookmark mutation ──────────────────────────────────────────

console.log('\n[4] Probing DeleteBookmark mutation…');
const PROBE_ID = allIds[0];
console.log(`   Probe tweet ID: ${PROBE_ID}`);

let workingQueryId: string | null = null;
let lastStatus = 0;
let lastBody = '';

for (const qid of CANDIDATE_QUERY_IDS) {
  const url = `https://x.com/i/api/graphql/${qid}/DeleteBookmark`;
  const body = JSON.stringify({
    variables: { tweet_id: PROBE_ID },
    queryId: qid,
  });

  console.log(`   Trying queryId=${qid}…`);
  const res = await fetch(url, { method: 'POST', headers, body });
  lastStatus = res.status;
  lastBody = await res.text();

  let parsed: any = null;
  try { parsed = JSON.parse(lastBody); } catch {}

  const displayBody = JSON.stringify(parsed ?? lastBody, null, 2).slice(0, 400);
  console.log(`   → HTTP ${res.status}  body: ${displayBody}`);

  if (res.ok && parsed?.data?.tweet_bookmark_delete === 'Done' && !parsed?.errors?.length) {
    workingQueryId = qid;
    break;
  }
}

// ── 5. Summary ────────────────────────────────────────────────────────────────

console.log('\n── RESULT ───────────────────────────────────────────────────────\n');

if (workingQueryId) {
  const isCurrent = workingQueryId === CANDIDATE_QUERY_IDS[0];
  console.log(`✓  DeleteBookmark works`);
  console.log(`   queryId : ${workingQueryId}`);
  if (isCurrent) {
    console.log(`   status  : matches hardcoded value in src/bookmark-delete.ts ✓`);
  } else {
    console.log(`   ⚠  queryId differs from hardcoded value — update DELETE_BOOKMARK_QUERY_ID`);
    console.log(`      in src/bookmark-delete.ts to: ${workingQueryId}`);
  }
  console.log(`   note    : probe tweet ${PROBE_ID} was removed from X`);
  console.log();
  if (!process.argv.includes('--all') && parseCountArg(process.argv) == null) {
    console.log(`   To run the full bulk delete on all ${allIds.length.toLocaleString()} live bookmarks:`);
    console.log(`   pnpm exec tsx scripts/debug-delete.ts --all`);
    console.log(`   Or delete only the latest N bookmarks:`);
    console.log(`   pnpm exec tsx scripts/debug-delete.ts --count 100`);
  }
} else {
  console.log(`❌  DeleteBookmark failed with all candidate query IDs`);
  console.log(`   Last HTTP status : ${lastStatus}`);
  console.log(`   Last body        : ${lastBody.slice(0, 500)}`);
  console.log();
  console.log('   To find the current queryId:');
  console.log('   1. Open x.com → DevTools (F12) → Network tab');
  console.log('   2. Manually click the bookmark icon on any tweet to un-bookmark it');
  console.log('   3. Find the "DeleteBookmark" request in the Network list');
  console.log('   4. Copy the queryId from the request URL or payload');
  console.log('   5. Update DELETE_BOOKMARK_QUERY_ID in src/bookmark-delete.ts');
  process.exit(1);
}

// ── 6. Bulk run (--all / --count) ─────────────────────────────────────────────

const countArg = parseCountArg(process.argv);
if ((process.argv.includes('--all') || countArg != null) && workingQueryId) {
  const targetCount = process.argv.includes('--all')
    ? allIds.length
    : Math.max(1, Math.min(countArg!, allIds.length));
  const targetIds = allIds.slice(0, targetCount);
  const remaining = targetIds.slice(1); // probe already deleted targetIds[0]
  console.log(`[6] Bulk deleting remaining ${remaining.length.toLocaleString()} live bookmarks…`);
  console.log('    Rate-limited to 250 ms per request. Estimated time:',
    `${Math.ceil((remaining.length * 0.25) / 60).toFixed(0)} min`);
  console.log();

  let lastPct = -1;
  const result = await deleteXBookmarks(remaining, session, (done, total) => {
    const pct = Math.floor((done / total) * 100);
    if (pct !== lastPct && (pct % 5 === 0 || done === total)) {
      process.stdout.write(`\r    ${(done + 1).toLocaleString()}/${total.toLocaleString()} (${pct}%)   `);
      lastPct = pct;
    }
  });

  console.log(`\n\n✓  Bulk delete complete`);
  console.log(`   Deleted : ${(result.deleted + 1).toLocaleString()} (including probe)`);
  console.log(`   Failed  : ${result.errors.length}`);
  if (result.errors.length) {
    console.log(`   Failed IDs: ${result.errors.slice(0, 5).join(', ')}${result.errors.length > 5 ? ` …+${result.errors.length - 5} more` : ''}`);
  }
}

function parseCountArg(argv: string[]): number | null {
  const idx = argv.indexOf('--count');
  if (idx === -1) return null;
  const value = Number(argv[idx + 1]);
  if (!Number.isInteger(value) || value <= 0) {
    console.error('❌  --count expects a positive integer, e.g. --count 100');
    process.exit(1);
  }
  return value;
}
