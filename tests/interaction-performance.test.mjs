import test from 'node:test';
import assert from 'node:assert/strict';
import { SelectionQueue, selectedIds } from '../app/selection-queue.ts';
import { communityWithFollowing } from '../app/community-selection.ts';
import { reusableImport, allowRouteWarmup, prepareRoutes } from '../app/route-loading.ts';
import { TextSubmissionQueue } from '../app/text-submission.ts';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
test('social choices change before the network settles and repeated pending taps do not duplicate writes', async () => {
  const queue = new SelectionQueue(), network = deferred(); let ids = [], commits = 0;
  const options = { change: selected => { ids = selectedIds(ids, 'post', selected); }, commit: selected => { commits++; assert.equal(selected, true); return network.promise; }, failed: () => assert.fail('Unexpected failure') };
  const pending = queue.toggle('liked', 'post', false, options);
  assert.deepEqual(ids, ['post']); assert.equal(commits, 1); assert.equal(queue.isPending('liked', 'post'), true);
  assert.equal(await queue.toggle('liked', 'post', true, options), false); assert.equal(commits, 1);
  network.resolve(); assert.equal(await pending, true); assert.equal(queue.isPending('liked', 'post'), false);
});
test('background refresh preserves pending choices while liked and saved actions remain independent', async () => {
  const queue = new SelectionQueue(), like = deferred(), save = deferred();
  const option = gate => ({ change: () => {}, commit: () => gate.promise, failed: () => assert.fail() });
  const a = queue.toggle('liked', 'post', true, option(like)), b = queue.toggle('saved', 'post', false, option(save));
  assert.deepEqual(queue.apply(['post', 'other'], 'liked'), ['other']);
  assert.deepEqual(queue.apply([], 'saved'), ['post']);
  like.resolve(); save.resolve(); assert.deepEqual(await Promise.all([a, b]), [true, true]);
});
test('a failed write rolls back only its item and explicit retries keep the desired selection', async () => {
  const queue = new SelectionQueue(), a = deferred(), b = deferred(); let ids = [], failures = 0;
  const options = (id, gate) => ({ change: selected => { ids = selectedIds(ids, id, selected); }, commit: selected => { assert.equal(selected, true); return gate.promise; }, failed: () => failures++ });
  const first = queue.toggle('liked', 'a', false, options('a', a)), other = queue.toggle('liked', 'b', false, options('b', b));
  b.resolve(); await other; a.reject(new TypeError('Network disconnected')); assert.equal(await first, false);
  assert.deepEqual(ids, ['b']); assert.equal(failures, 1);
  const retry = deferred(), pending = queue.toggle('liked', 'a', false, options('a', retry)); retry.resolve(); assert.equal(await pending, true);
  assert.deepEqual(ids, ['b', 'a']);
});
test('follow rollback restores that person’s latest observation without replacing another follow', () => {
  const stories = ['a', 'b'].map(userId => ({ id: userId, userId, author: userId, image: '/photo', date: '2026-10-03', note: '' }));
  const original = { userId: 'me', following: ['a', 'b'], followingCount: 2, followerCount: 5, stories, people: ['a', 'b', 'c'].map(id => ({ id, name: id, count: 1, following: id !== 'c' })) };
  const removing = communityWithFollowing(original, ['b']);
  assert.deepEqual(removing.stories.map(item => item.userId), ['b']); assert.equal(removing.people[0].following, false);
  const independent = communityWithFollowing(removing, ['b', 'c']);
  const restored = communityWithFollowing(independent, ['b', 'c', 'a'], [stories[0]]);
  assert.deepEqual(restored.following, ['b', 'c', 'a']); assert.equal(restored.followingCount, 3); assert.equal(restored.followerCount, 5);
  assert.deepEqual(new Set(restored.stories.map(item => item.userId)), new Set(['a', 'b'])); assert.equal(restored.people[2].following, true);
});
test('hover, focus and navigation share one import and failed preparation can retry', async () => {
  const gate = deferred(); let calls = 0;
  const load = reusableImport(() => { calls++; return gate.promise; });
  const hover = load(), focus = load(), navigation = load();
  assert.equal(hover, focus); assert.equal(focus, navigation); assert.equal(calls, 1);
  const module = { default: 'component' }; gate.resolve(module); assert.equal(await navigation, module); assert.equal(await load(), module); assert.equal(calls, 1);
  let attempts = 0; const retryable = reusableImport(async () => { if (++attempts === 1) throw new Error('Connection lost'); return module; });
  await assert.rejects(retryable(), /Connection lost/); assert.equal(await retryable(), module); assert.equal(attempts, 2);
});
test('optional preparation respects data-saving and very slow networks', () => {
  assert.equal(allowRouteWarmup(), true); assert.equal(allowRouteWarmup({ effectiveType: '4g' }), true);
  for (const connection of [{ saveData: true }, { effectiveType: 'slow-2g' }, { effectiveType: '2g' }]) assert.equal(allowRouteWarmup(connection), false);
});
test('route preparation starts only in idle slots, stays sequential and stops on cancellation',async()=>{
 const work=[],first=deferred(),calls=[];
 const idle=fn=>{work.push(fn);return()=>{const i=work.indexOf(fn);if(i>=0)work.splice(i,1);};};
 const stop=prepareRoutes([()=>{calls.push('first');return first.promise;},async()=>{calls.push('second');}],idle,()=>true);
 assert.deepEqual(calls,[]);assert.equal(work.length,1);work.shift()();assert.deepEqual(calls,['first']);assert.equal(work.length,0);
 first.resolve();await new Promise(setImmediate);assert.equal(work.length,1);stop();assert.equal(work.length,0);assert.deepEqual(calls,['first']);
});
test('idle preparation yields to changed network or visibility conditions and failed imports do not block later sections',async()=>{
 const work=[],calls=[];let allowed=true;const idle=fn=>{work.push(fn);return()=>{};};
 prepareRoutes([async()=>{calls.push('first');throw new Error('Connection interrupted');},async()=>{calls.push('second');}],idle,()=>allowed);
 work.shift()();await new Promise(setImmediate);assert.deepEqual(calls,['first']);allowed=false;work.shift()();assert.deepEqual(calls,['first']);
 prepareRoutes([async()=>calls.push('unused')],idle,()=>false);assert.equal(work.length,0);
});
test('comment retries reuse the uncertain receipt while duplicate submits and unrelated drafts remain independent', async () => {
  const queue = new TextSubmissionQueue(), gate = deferred(), receipts = [];
  const pending = queue.run('post-a', 'Original text', id => { receipts.push(id); return gate.promise; });
  assert.equal(await queue.run('post-a', 'Original text', () => assert.fail('Duplicate submit')), false);
  assert.equal(await queue.run('post-b', 'Another draft', async id => { assert.notEqual(id, receipts[0]); }), true);
  gate.reject(new TypeError('Unknown server acknowledgement')); await assert.rejects(pending);
  assert.equal(await queue.run('post-a', 'Original text', async id => { receipts.push(id); }), true);
  assert.equal(receipts[0], receipts[1]);
  assert.equal(await queue.run('post-a', 'A later identical-length comment', async id => { assert.notEqual(id, receipts[0]); }), true);
});
