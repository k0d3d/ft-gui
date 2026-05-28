import test from 'node:test';
import assert from 'node:assert/strict';

test('deleteXBookmarks treats HTTP 200 GraphQL errors as failed deletes', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: {},
        errors: [{ message: 'Tweet was not found in actor favorites' }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  try {
    const { deleteXBookmarks } = await import('../src/bookmark-delete.js');
    const result = await deleteXBookmarks(['tweet-1'], { csrfToken: 'ct0', cookieHeader: 'ct0=abc' } as any);
    assert.deepEqual(result, { deleted: 0, errors: ['tweet-1'] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('deleteXBookmarks treats tweet_bookmark_delete=Done as success', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: { tweet_bookmark_delete: 'Done' },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  try {
    const { deleteXBookmarks } = await import('../src/bookmark-delete.js');
    const result = await deleteXBookmarks(['tweet-1'], { csrfToken: 'ct0', cookieHeader: 'ct0=abc' } as any);
    assert.deepEqual(result, { deleted: 1, errors: [] });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
