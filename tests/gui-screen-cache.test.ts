import test from 'node:test';
import assert from 'node:assert/strict';
import { nextMountedScreenNames } from '../gui/renderer/screen-cache.js';

test('nextMountedScreenNames keeps previously visited base screens mounted', () => {
  const mounted = nextMountedScreenNames(['dashboard', 'settings'], 'sync');
  assert.deepEqual(mounted, ['dashboard', 'settings', 'sync']);
});

test('nextMountedScreenNames does not mount detail screens in the persistent cache', () => {
  const mounted = nextMountedScreenNames(['dashboard'], { name: 'detail', id: '123' });
  assert.deepEqual(mounted, ['dashboard']);
});

test('nextMountedScreenNames does not duplicate an existing screen', () => {
  const mounted = nextMountedScreenNames(['dashboard', 'settings'], 'settings');
  assert.deepEqual(mounted, ['dashboard', 'settings']);
});
