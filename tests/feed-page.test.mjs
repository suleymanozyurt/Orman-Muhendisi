import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeObservationPage } from '../app/feed-page.ts';

test('refresh updates the existing post, puts new observations first and keeps older pages without duplicates', () => {
  const previous=[{id:'recent',createdAt:'2026-10-01T10:00:00Z',text:'Old note',comments:[]},{id:'older-page',createdAt:'2026-09-01T10:00:00Z',text:'Older observation'},{id:'editorial',text:'Editor note'}];
  const incoming=[{id:'new',createdAt:'2026-10-01T11:00:00Z',text:'New observation'},{id:'recent',createdAt:'2026-10-01T10:00:00Z',text:'Edited note',comments:['New comment']}];
  const result=mergeObservationPage(previous,incoming);
  assert.deepEqual(result.map(post=>post.id),['new','recent','older-page','editorial']);
  assert.equal(result[1].text,'Edited note');assert.deepEqual(result[1].comments,['New comment']);
  assert.deepEqual(mergeObservationPage(result,incoming),result);
});

test('a partial authoritative refresh removes absent recent records, while older cached pages survive', () => {
  const previous=[{id:'withdrawn',createdAt:'2026-10-01T12:00:00Z'},{id:'present',createdAt:'2026-10-01T11:00:00Z'},{id:'older',createdAt:'2026-09-01T10:00:00Z'},{id:'editorial'}];
  assert.deepEqual(mergeObservationPage(previous,[previous[1]],{refresh:true,complete:false}).map(post=>post.id),['present','older','editorial']);
  // Following requests are a subset of the community, not an authoritative refresh of it.
  assert.equal(mergeObservationPage(previous,[previous[1]]).length,4);
});

test('a complete empty refresh removes deleted server posts and preserves local editor notes', () => {
  const previous=[{id:'deleted',createdAt:'2026-10-01T12:00:00Z'},{id:'editorial'}];
  assert.deepEqual(mergeObservationPage(previous,[],{refresh:true,complete:true}),[{id:'editorial'}]);
});

test('equal timestamps use the server ID order, so a page boundary retains older IDs', () => {
  const at='2026-10-01T12:00:00Z';
  const previous=[{id:'z',createdAt:at},{id:'m',createdAt:at},{id:'a',createdAt:at}];
  assert.deepEqual(mergeObservationPage(previous,[previous[1]],{refresh:true}).map(post=>post.id),['m','a']);
});
