import type { BrowserSession } from './graphql-bookmarks.js';

const X_PUBLIC_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36';

// Refresh by searching for `operationName:"DeleteBookmark"` in X's main JS bundle
// at abs.twimg.com/responsive-web/client-web/main.<hash>.js
const DELETE_BOOKMARK_QUERY_ID = 'Wlmlj2-xzyS1GN3a6cj-mQ';
const DELETE_BOOKMARK_OPERATION = 'DeleteBookmark';

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
  const url = `https://x.com/i/api/graphql/${DELETE_BOOKMARK_QUERY_ID}/${DELETE_BOOKMARK_OPERATION}`;
  const body = JSON.stringify({
    variables: { tweet_id: tweetId },
    queryId: DELETE_BOOKMARK_QUERY_ID,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(session),
    body,
  });
  return res.ok;
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
