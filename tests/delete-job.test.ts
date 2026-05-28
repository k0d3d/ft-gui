import test from 'node:test';
import assert from 'node:assert/strict';
import { startDeleteBookmarksJob } from '../gui/main/delete-job.js';

test('startDeleteBookmarksJob emits progress and done with one stable jobId', async () => {
  const events: Array<{ channel: string; payload: any }> = [];

  const { jobId, finished } = startDeleteBookmarksJob({
    randomUUID: () => 'job-123',
    getAllTweetIds: async () => ['1', '2'],
    detectValidSessions: async () => [{ csrfToken: 'ct0', cookieHeader: 'ct0=abc' }],
    deleteXBookmarks: async (tweetIds, session, onProgress) => {
      assert.deepEqual(tweetIds, ['1', '2']);
      assert.equal(session.csrfToken, 'ct0');
      onProgress?.(1, 2);
      onProgress?.(2, 2);
      return { deleted: 2, errors: [] };
    },
    emit: (channel, payload) => {
      events.push({ channel, payload });
    },
  });

  assert.equal(jobId, 'job-123');

  await finished;

  assert.deepEqual(events, [
    { channel: 'delete:progress', payload: { jobId: 'job-123', done: 0, total: 2 } },
    { channel: 'delete:progress', payload: { jobId: 'job-123', done: 1, total: 2 } },
    { channel: 'delete:progress', payload: { jobId: 'job-123', done: 2, total: 2 } },
    { channel: 'delete:done', payload: { jobId: 'job-123', deleted: 2, errors: 0 } },
  ]);
});

test('startDeleteBookmarksJob emits delete:error when no browser session is available', async () => {
  const events: Array<{ channel: string; payload: any }> = [];

  const { finished } = startDeleteBookmarksJob({
    randomUUID: () => 'job-err',
    getAllTweetIds: async () => ['1'],
    detectValidSessions: async () => [],
    deleteXBookmarks: async () => ({ deleted: 0, errors: [] }),
    emit: (channel, payload) => {
      events.push({ channel, payload });
    },
  });

  await finished;

  assert.deepEqual(events, [
    {
      channel: 'delete:error',
      payload: {
        jobId: 'job-err',
        error: 'No browser session found. Open x.com in Chrome or Firefox first.',
      },
    },
  ]);
});

test('startDeleteBookmarksJob uses explicit tweet ids without loading the full library', async () => {
  let loadCalls = 0;
  const events: Array<{ channel: string; payload: any }> = [];

  const { finished } = startDeleteBookmarksJob({
    randomUUID: () => 'job-explicit',
    tweetIds: ['11', '22'],
    getAllTweetIds: async () => {
      loadCalls++;
      return ['should-not-load'];
    },
    detectValidSessions: async () => [{ csrfToken: 'ct0', cookieHeader: 'ct0=abc' }],
    deleteXBookmarks: async (tweetIds, _session, onProgress) => {
      assert.deepEqual(tweetIds, ['11', '22']);
      onProgress?.(2, 2);
      return { deleted: 2, errors: [] };
    },
    emit: (channel, payload) => {
      events.push({ channel, payload });
    },
  });

  await finished;

  assert.equal(loadCalls, 0);
  assert.deepEqual(events.at(-1), {
    channel: 'delete:done',
    payload: { jobId: 'job-explicit', deleted: 2, errors: 0 },
  });
});
