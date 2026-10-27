import assert from 'node:assert/strict';
import test from 'node:test';

import { networkFirst } from '../lib/networkFirst.ts';

test('a successful fetch is returned and the cache is not read', async () => {
  let cacheReads = 0;
  const value = await networkFirst(
    async () => 'fresh',
    async () => {
      cacheReads += 1;
      return 'stale';
    },
    () => 'sample',
  );
  assert.equal(value, 'fresh');
  assert.equal(cacheReads, 0);
});

test('a failed fetch falls back to the saved copy', async () => {
  let sampleReads = 0;
  const value = await networkFirst(
    async () => {
      throw new Error('offline');
    },
    async () => 'stale',
    () => {
      sampleReads += 1;
      return 'sample';
    },
  );
  assert.equal(value, 'stale');
  assert.equal(sampleReads, 0);
});

test('a failed fetch with no saved copy uses the bundled sample', async () => {
  const value = await networkFirst(
    async () => {
      throw new Error('offline');
    },
    async () => null,
    () => 'sample',
  );
  assert.equal(value, 'sample');
});

test('a failed fetch with nothing saved rethrows', async () => {
  await assert.rejects(
    () =>
      networkFirst(
        async () => {
          throw new Error('offline');
        },
        async () => null,
        () => null,
      ),
    /offline/,
  );
});
