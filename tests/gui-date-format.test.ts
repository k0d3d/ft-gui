import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBookmarkDate } from '../gui/renderer/date-format.js';

test('formatBookmarkDate includes the year for legacy Twitter dates', () => {
  assert.equal(formatBookmarkDate('Fri May 22 19:53:15 +0000 2026'), 'Fri May 22, 2026');
});

test('formatBookmarkDate includes the year for ISO dates', () => {
  assert.equal(formatBookmarkDate('2026-01-15T00:00:00Z'), 'Thu Jan 15, 2026');
});

test('formatBookmarkDate falls back to a trimmed value when the date cannot be parsed', () => {
  assert.equal(formatBookmarkDate('not-a-date'), 'not-a-date');
});
