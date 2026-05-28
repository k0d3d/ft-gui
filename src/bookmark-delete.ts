import { fetchBookmarkedTweetIds, type BrowserSession } from './graphql-bookmarks.js';
import { loadPreferences } from './preferences.js';

const X_PUBLIC_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

// Hardcoded fallback — updated by health check auto-heal via preferences file.
// To manually refresh: run scripts/find-delete-query-id.ts
const DELETE_BOOKMARK_QUERY_ID_FALLBACK = 'Wlmlj2-xzyS1GN3a6cj-mQ';

function getDeleteQueryId(): string {
  return loadPreferences().deleteBookmarkQueryId ?? DELETE_BOOKMARK_QUERY_ID_FALLBACK;
}
const DELETE_BOOKMARK_OPERATION = 'DeleteBookmark';
export const DELETE_BOOKMARK_OPERATION_NAME = DELETE_BOOKMARK_OPERATION;

const DELAY_MS = 250; // between requests to avoid rate-limiting

function buildHeaders(session: BrowserSession): Record<string, string> {
  return {
    authorization: `Bearer ${X_PUBLIC_BEARER}`,
    'x-csrf-token': session.csrfToken,
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-active-user': 'yes',
    'content-type': 'application/json',
    'user-agent': CHROME_UA,
    cookie: session.cookieHeader ?? `ct0=${session.csrfToken}`,
  };
}

async function deleteSingle(tweetId: string, session: BrowserSession): Promise<boolean> {
  const qid = getDeleteQueryId();
  const url = `https://x.com/i/api/graphql/${qid}/${DELETE_BOOKMARK_OPERATION}`;
  const body = JSON.stringify({
    variables: { tweet_id: tweetId },
    queryId: qid,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(session),
    body,
  });
  if (!res.ok) return false;

  const text = await res.text();
  try {
    const json = JSON.parse(text) as {
      data?: { tweet_bookmark_delete?: string };
      errors?: unknown[];
    };
    return json.data?.tweet_bookmark_delete === 'Done' && !json.errors?.length;
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deleteXBookmarks(
  tweetIds: string[],
  session: BrowserSession,
  onProgress?: (done: number, total: number) => void,
): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0;
  const errors: string[] = [];

  for (let i = 0; i < tweetIds.length; i++) {
    const tweetId = tweetIds[i];
    try {
      const ok = await deleteSingle(tweetId, session);
      if (ok) {
        deleted++;
      } else {
        errors.push(tweetId);
      }
    } catch (err) {
      errors.push(tweetId);
    }

    onProgress?.(i + 1, tweetIds.length);

    if (i < tweetIds.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  return { deleted, errors };
}

export async function getCurrentBookmarkTweetIds(
  session: BrowserSession,
  maxCount?: number,
): Promise<string[]> {
  return fetchBookmarkedTweetIds(session.csrfToken, session.cookieHeader, { maxCount });
}
