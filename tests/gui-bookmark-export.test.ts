import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBookmarkExportJson } from '../gui/renderer/bookmark-export.js';

test('buildBookmarkExportJson always serializes selected bookmarks as an array', () => {
  const json = buildBookmarkExportJson([
    {
      id: 'bookmark-1',
      url: 'https://x.com/example/status/1',
      text: 'One selected bookmark',
      authorHandle: 'example',
      postedAt: '2026-05-27T12:00:00Z',
      score: 1.25,
    },
  ]);

  const parsed = JSON.parse(json);
  assert.ok(Array.isArray(parsed));
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, 'bookmark-1');
});

test('buildBookmarkExportJson preserves the visible selection order', () => {
  const json = buildBookmarkExportJson([
    { id: 'first', url: 'https://x.com/a/status/1', text: 'First', score: 2 },
    { id: 'second', url: 'https://x.com/b/status/2', text: 'Second', score: 1 },
  ]);

  assert.deepEqual(
    JSON.parse(json).map((item: { id: string }) => item.id),
    ['first', 'second'],
  );
});
