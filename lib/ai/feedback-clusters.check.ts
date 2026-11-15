// Run: npx tsx lib/ai/feedback-clusters.check.ts
import assert from 'node:assert/strict';
import { clusterFeedback, type AnchoredFeedback } from './feedback-clusters';

const f = (id: string, start: number | null, len: number | null, reader: string | null, kind: AnchoredFeedback['kind'] = 'comment'): AnchoredFeedback =>
  ({ id, kind, charStart: start, charLength: len, reader, text: id, quote: null });

// Overlapping ranges merge; chain overlap (a∩b, b∩c, a∌c) merges into one.
const chain = clusterFeedback([f('a', 0, 10, 'r1'), f('b', 8, 10, 'r2'), f('c', 16, 5, 'r1')]);
assert.equal(chain.length, 1);
assert.deepEqual(chain[0].itemIds, ['a', 'b', 'c']);
assert.equal(chain[0].readerCount, 2);
assert.equal(chain[0].charEnd, 21);

// Touching but not overlapping ranges stay separate; singletons are dropped.
assert.equal(clusterFeedback([f('a', 0, 10, 'r1'), f('b', 10, 5, 'r2')]).length, 0);

// Unanchored and zero-length items are ignored.
assert.equal(clusterFeedback([f('a', null, null, 'r1'), f('b', 5, 0, 'r2'), f('c', 0, 10, 'r3')]).length, 0);

// Dislikes count toward the group but are not linkable ids; a nested range inside a long one merges.
const mixed = clusterFeedback([f('long', 0, 100, 'r1'), f('d', 40, 5, 'r2', 'dislike'), f('s', 90, 5, null, 'suggestion')]);
assert.equal(mixed.length, 1);
assert.deepEqual(mixed[0].itemIds, ['long', 's']);
assert.equal(mixed[0].dislikes, 1);
assert.equal(mixed[0].suggestions, 1);
assert.equal(mixed[0].readerCount, 3); // anonymous falls back to its own id

// Unsorted input is handled.
assert.equal(clusterFeedback([f('b', 50, 5, 'r2'), f('a', 48, 5, 'r1')]).length, 1);

console.log('feedback-clusters: all checks passed');
