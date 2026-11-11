import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { parseSocialArchive, parseSocialArchiveText, unresolvedSocialMedia, validateSocialPost, safeSocialMediaUrl, youtubeSocialEmbed, chunkSocialImports, socialSearchText } from '../app/social-archive-model.ts';
import { handleSocial } from '../app/api/social/handler.ts';
const sqlite = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
function prepared(sql, args = []) { return { sql, args, bind(...values) { return prepared(sql, values); }, async first() { return sqlite.prepare(sql).get(...args) || null; }, async all() { return { results: sqlite.prepare(sql).all(...args) }; }, async run() { return sqlite.prepare(sql).run(...args); } }; }
const db = { prepare: prepared, async batch(statements) { sqlite.exec('BEGIN'); try { const result = statements.map(s => sqlite.prepare(s.sql).run(...s.args)); sqlite.exec('COMMIT'); return result; } catch (cause) { sqlite.exec('ROLLBACK'); throw cause; } } };
function request(body, { admin = true, user = 'editor', query = '', origin } = {}) { return new Request('https://example.org/api/social' + query, { method: body ? 'POST' : 'GET', headers: { ...(user ? { 'oai-authenticated-user-id': user } : {}), ...(admin ? { 'oai-authenticated-user-email': 'suleymanozyurt49@gmail.com' } : {}), ...(origin ? { origin } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
const json = async req => (await handleSocial(req, db)).json();
const source = { platform: 'instagram', title: 'İğne yapraklı ağaçlar', text: 'Original caption', publishedAt: '2026-09-30T12:00:00.000Z', sourceUrl: 'https://www.instagram.com/p/example/', media: [] };

test('social imports retain dates, full captions and media paths from native Instagram and Facebook post exports', async () => {
  const instagram = [{ title: 'Original caption', creation_timestamp: 1750000000, media: [{ uri: 'media/posts/one.jpg', title: 'Leaf detail' }, { uri: 'media/reels/two.mp4' }] }];
  const parsed = await parseSocialArchive(instagram, 'instagram'); assert.equal(parsed.posts.length, 1); assert.equal(parsed.posts[0].text, 'Original caption'); assert.equal(parsed.posts[0].publishedAt, new Date(1750000000 * 1000).toISOString()); assert.equal(unresolvedSocialMedia(parsed.posts[0]).length, 2); assert.equal(parsed.posts[0].media[1].type, 'video'); assert.equal(parsed.posts[0].media[0].url, undefined); assert.equal(parsed.posts[0].status, 'draft');
  assert.deepEqual(parsed, await parseSocialArchive(instagram, 'instagram'));
  const facebook = await parseSocialArchive({ your_posts: [{ timestamp: 1750000000, data: [{ post: 'First paragraph' }, { post: 'Second paragraph' }], attachments: [{ data: [{ media: { uri: 'your_posts/photo.jpg' } }] }] }] }, 'facebook');
  assert.equal(facebook.posts[0].text, 'First paragraph\n\nSecond paragraph'); assert.equal(facebook.unresolved, 1);
  await assert.rejects(parseSocialArchive([{ ...source, publishedAt: '2025-02-29' }], 'instagram'), /ARCHIVE_ITEM_INVALID/);
});

test('X export JavaScript is parsed as data without execution, and private messages or reposts do not become authored posts', async () => {
  const raw = 'window.YTD.tweets.part0 = ' + JSON.stringify([{ tweet: { id_str: '1234', full_text: 'Authored post', created_at: 'Wed Sep 30 12:00:00 +0000 2026' } }, { tweet: { id_str: '222', full_text: 'RT @someone: another author' } }]) + ';';
  const parsed = await parseSocialArchive(parseSocialArchiveText(raw), 'x'); assert.equal(parsed.posts.length, 1); assert.equal(parsed.skipped, 1); assert.equal(parsed.posts[0].sourceUrl, 'https://x.com/0rmanmuhendisi/status/1234');
  assert.throws(() => parseSocialArchiveText('globalThis.secret = 1; []'), SyntaxError);
  await assert.rejects(parseSocialArchive({ messages: [{ text: 'Private message' }] }, 'instagram'), /PRIVATE_ARCHIVE/);
  const messages = await parseSocialArchive([{ sender: 'another', text: 'Do not publish this' }], 'facebook'); assert.equal(messages.posts.length, 0); assert.equal(messages.skipped, 1);
});

test('unsafe media and source links cannot enter published content and chunking stays under request budgets', async () => {
  for (const url of ['javascript:alert(1)', 'http://example.org/image.jpg', 'https://user:password@example.org/photo', 'https://localhost/pic', 'https://127.0.0.1/pic', 'https://0.0.0.0/pic', 'https://[::1]/pic', 'https://10.1.1.1/pic']) assert.equal(safeSocialMediaUrl(url), '');
  assert.equal(youtubeSocialEmbed('https://youtu.be/abcdefghijk'), 'https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0'); assert.equal(youtubeSocialEmbed('https://evil.example/watch?v=abcdefghijk'), '');
  await assert.rejects(parseSocialArchive([{ ...source, sourceUrl: 'javascript:alert(1)' }], 'instagram'), /ARCHIVE_ITEM_INVALID/);
  const { posts } = await parseSocialArchive(Array.from({ length: 101 }, (_, index) => ({ ...source, sourceUrl: 'https://www.instagram.com/p/post-' + index + '/', text: 'a'.repeat(20000) })), 'instagram');
  assert.equal(chunkSocialImports(posts).flat().length, 101); assert(chunkSocialImports(posts).every(batch => batch.length <= 40 && new TextEncoder().encode(JSON.stringify({ posts: batch })).length < 500000));
  assert.equal(validateSocialPost({ ...posts[0], media: Array.from({ length: 101 }, () => ({ type: 'image', url: 'https://example.org/photo.jpg', alt: '' })) }), false);
  assert.equal(socialSearchText('İĞNE YAPRAKLI'), 'igne yaprakli');
});

test('archive imports persist as drafts, are idempotent, keep private media private and require administrative publication', async () => {
  const parsed = await parseSocialArchive([{ ...source, media: [{ uri: 'media/posts/missing.jpg' }] }], 'instagram'); const post = parsed.posts[0];
  assert.equal((await handleSocial(request({ action: 'import', posts: [post] }, { admin: false, user: null }), db)).status, 401);
  assert.equal((await handleSocial(request({ action: 'import', posts: [post] }, { admin: false }), db)).status, 403);
  assert.equal((await handleSocial(request({ action: 'import', posts: [post] }, { origin: 'https://evil.example' }), db)).status, 403);
  assert.equal((await json(request({ action: 'import', posts: [post] }))).imported, 1); assert.equal((await json(request({ action: 'import', posts: [post] }))).skipped, 1);
  assert.equal((await json(request(null, { admin: false, user: null, query: '?status=draft' }))).records.length, 0);
  const own = (await json(request(null, { query: '?status=draft' }))).records[0]; assert.equal(own.id, post.id); assert.equal(own.media[0].path, 'media/posts/missing.jpg'); assert.equal('user_id' in own, false);
  assert.equal((await handleSocial(request({ action: 'save', post: { ...own, status: 'published' } }), db)).status, 400);
  const key = crypto.randomUUID() + '.jpg'; sqlite.prepare('INSERT INTO uploads (key,user_id,created_at) VALUES (?,?,?)').run(key, 'someone-else', '2026-10-03');
  const complete = { ...own, status: 'published', media: [{ type: 'image', uploadedKey: key, alt: 'Leaf detail', path: 'private/archive/path.jpg' }] };
  assert.equal((await handleSocial(request({ action: 'save', post: complete }), db)).status, 403);
  sqlite.prepare('UPDATE uploads SET user_id=? WHERE key=?').run('editor', key);
  assert.equal((await handleSocial(request({ action: 'save', post: complete }), db)).status, 200);
  assert.equal((await handleSocial(request({ action: 'save', post: complete }), db)).status, 409);
  const publicData = await json(request(null, { admin: false, user: null, query: '?q=igne' })); assert.equal(publicData.records.length, 1); assert.equal(publicData.records[0].media[0].uploadedKey, key); assert.equal('path' in publicData.records[0].media[0], false);
  assert.equal((await handleSocial(request({ action: 'delete', id: post.id, revision: 0 }), db)).status, 409); assert.equal((await handleSocial(request({ action: 'delete', id: post.id, revision: 1 }), db)).status, 200);
});

test('social filtering and pagination count only the visible projection and batch media checks stay D1 bounded', async () => {
  const { posts } = await parseSocialArchive(Array.from({ length: 26 }, (_, index) => ({ ...source, title: 'Post ' + index, sourceUrl: 'https://www.instagram.com/p/page-' + index + '/', publishedAt: '2026-09-30T12:00:00.000Z' })), 'instagram');
  for (const post of posts) assert.equal((await handleSocial(request({ action: 'save', post: { ...post, status: 'published' } }), db)).status, 200);
  const first = await json(request(null, { admin: false, query: '?kind=article' })); assert.equal(first.records.length, 24); assert.equal(first.total, 26); assert.equal(first.hasMore, true);
  const second = await json(request(null, { admin: false, query: '?kind=article&offset=24' })); assert.equal(second.records.length, 2); assert.equal(second.hasMore, false); assert.equal(first.records.some(post => second.records.some(next => next.id === post.id)), false);
  for (const query of ['?offset=-1', '?platform=invalid', '?kind=invalid', '?id=not-real']) assert.equal((await handleSocial(request(null, { query }), db)).status, 400);
  const keys = Array.from({ length: 100 }, () => crypto.randomUUID() + '.jpg'); for (const key of keys) sqlite.prepare('INSERT INTO uploads (key,user_id,created_at) VALUES (?,?,?)').run(key, 'editor', '2026-10-03');
  const album = { ...posts[0], id: crypto.randomUUID(), media: keys.map(uploadedKey => ({ type: 'image', uploadedKey, alt: '' })), status: 'draft' };
  let max = 0; const bounded = { ...db, prepare(sql) { const statement = prepared(sql); return { ...statement, bind(...args) { max = Math.max(max, args.length); return prepared(sql, args); } }; } };
  assert.equal((await handleSocial(request({ action: 'save', post: album }), bounded)).status, 200); assert(max <= 80);
});
