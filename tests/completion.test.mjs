import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const asModule = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
function moduleCode(path) { return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText; }
const fieldUrl = asModule(moduleCode('../app/field-draft.ts').replace('"./link-preview.ts"', JSON.stringify(new URL('../app/link-preview.ts', import.meta.url).href)));
const { fieldSignature, validateFieldDraft, publishFieldDraft, submitFieldDraft, FieldUploadError } = await import(fieldUrl);
const { sourceCoverage } = await import(asModule(moduleCode('../app/source-coverage.ts')));
const { registerFieldNavigation, preserveOpenFieldDraft } = await import(asModule(moduleCode('../app/field-navigation.ts')));
const gbifUrl = asModule(moduleCode('../app/gbif-query.ts'));
const catalogUrl = asModule(moduleCode('../app/catalog-state.ts'));
const navUrl = asModule(moduleCode('../app/navigation.ts').replace('"./catalog-state"', JSON.stringify(catalogUrl)).replace('"./source-catalog-query"',JSON.stringify(asModule(moduleCode('../app/source-catalog-query.ts').replace('"./catalog-types.ts"',JSON.stringify(new URL('../app/catalog-types.ts',import.meta.url).href))))).replace('"./gbif-query"', JSON.stringify(gbifUrl)));
const { readSiteRoute, siteRouteUrl } = await import(navUrl);
const { canonicalRoute, isIndexableRoute, jsonForHtml, xmlText, robotsText } = await import(asModule(moduleCode('../app/seo.ts').replace('"./navigation"', JSON.stringify(navUrl))));
let taxonCode = moduleCode('../app/observation-taxon.ts').replace('"./data/life-taxonomy.json"', JSON.stringify(new URL('../app/data/life-taxonomy.json', import.meta.url).href)).replace('"./life-types"', JSON.stringify(asModule(moduleCode('../app/life-types.ts'))));
const { validLivingTaxon } = await import(asModule(taxonCode));
const uuid = i => String(i).padStart(8, '0') + '-0000-4000-a000-000000000000';
function draft(overrides = {}) {
  const value = { id: uuid(1), owner: 'member', updatedAt: '2026-10-03T12:00:00Z', text: 'Field note', plantId: 'cedrus-libani', observedAt: '2026-10-03', share: false, position: { latitude: '', longitude: '' }, photos: [], clientId: uuid(2), ...overrides };
  return { ...value, signature: fieldSignature(value) };
}
const photo = i => ({ id: uuid(i + 20), name: 'photo-' + i + '.jpg', type: 'image/jpeg', size: 100, organ: 'Yaprak' });

test('field drafts allow 100 photos and preserve incomplete local forms while publication stays strict', () => {
  validateFieldDraft(draft({ photos: Array.from({ length: 100 }, (_, i) => photo(i)) }));
  assert.throws(() => validateFieldDraft(draft({ photos: Array.from({ length: 101 }, (_, i) => photo(i)) })), /INVALID_DRAFT/);
  assert.throws(() => validateFieldDraft(draft({ photos: [photo(1), photo(1)] })), /INVALID_DRAFT/);
  for (const position of [{ latitude: '91', longitude: '40' }, { latitude: '40', longitude: '' }, { latitude: 'x', longitude: '40' }]) {
    const value = draft({ position }); validateFieldDraft(value, true); assert.throws(() => validateFieldDraft(value), /INVALID_LOCATION/);
  }
  for (const observedAt of ['2025-02-29', '2026-09-31', 'no-date', '']) {
    const value = draft({ observedAt }); validateFieldDraft(value, true); assert.throws(() => validateFieldDraft(value), /INVALID_DATE/);
  }
  assert.throws(() => validateFieldDraft(draft({ text: '', photos: [] })), /EMPTY_DRAFT/);
  assert.throws(() => validateFieldDraft(draft({ photos: [{ ...photo(1), size: 1_500_001 }] })), /INVALID_PHOTO/);
});

test('known completed uploads resume after a lost connection without publishing a partial album', async () => {
  const original = draft({ photos: [photo(0), photo(1), photo(2)] }), uploaded = [], progress = [];
  let checkpoint, saves = 0;
  const fetcher = async (path, options) => {
    if (path === '/api/state') { saves++; return Response.json({ id: original.clientId, status: 'draft' }); }
    const name = options.body.get('file').name; uploaded.push(name);
    if (name === 'photo-1.jpg') throw new TypeError('Offline');
    return Response.json({ key: uuid(name === 'photo-0.jpg' ? 100 : 102) + '.jpg' });
  };
  await assert.rejects(publishFieldDraft(original, async () => new Blob(['image'], { type: 'image/jpeg' }), { fetcher, onCheckpoint: async value => { checkpoint = structuredClone(value); } }), error => error instanceof FieldUploadError && error.code === 'OFFLINE');
  assert.equal(saves, 0); assert.equal(uploaded.length, 3);
  assert.equal(original.photos.some(value => value.uploadedKey), false);
  assert.equal(checkpoint.photos.filter(value => value.uploadedKey).length, 2);
  const resumed = [];
  const result = await publishFieldDraft(checkpoint, async id => { resumed.push(id); return new Blob(['image'], { type: 'image/jpeg' }); }, {
    fetcher: async (path, options) => {
      if (path === '/api/upload') { uploaded.push(options.body.get('file').name); return Response.json({ key: uuid(101) + '.jpg' }); }
      saves++; const body = JSON.parse(options.body); assert.equal(body.clientId, original.clientId); assert.equal(body.photos.length, 3); return Response.json({ id: body.clientId, status: 'draft' });
    }, onProgress: value => progress.push(value),
  });
  assert.equal(result.id, original.clientId); assert.equal(saves, 1); assert.equal(uploaded.length, 4);
  assert.deepEqual(resumed, [photo(1).id]); assert.equal(progress.at(-1), 3);
});

test('album uploads bound parallel work and retry the same logical observation after an uncertain save', async () => {
  const value = draft({ photos: Array.from({ length: 8 }, (_, i) => photo(i)) });
  let active = 0, peak = 0, checkpoint, writes = 0; const postedIds = [];
  const fetcher = async (path, options) => {
    if (path === '/api/upload') { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return Response.json({ key: uuid(200 + Number(options.body.get('file').name.match(/\d+/)[0])) + '.jpg' }); }
    postedIds.push(JSON.parse(options.body).clientId); if (++writes === 1) return new Response('', { status: 503 }); return Response.json({ id: value.clientId, status: 'draft' });
  };
  await assert.rejects(publishFieldDraft(value, async () => new Blob(['image']), { fetcher, onCheckpoint: async result => { checkpoint = structuredClone(result); } }), error => error.code === 'SAVE_FAILED');
  assert.equal(peak, 3); assert(checkpoint.photos.every(photo => photo.uploadedKey));
  await publishFieldDraft(checkpoint, async () => { throw new Error('Should reuse uploads'); }, { fetcher });
  assert.deepEqual(postedIds, [value.clientId, value.clientId]);
});

test('navigation waits for the open field journal and old cleanup cannot unregister a new editor', async () => {
  assert.equal(await preserveOpenFieldDraft(), true);
  const first = registerFieldNavigation(async () => false); assert.equal(await preserveOpenFieldDraft(), false);
  let finish; const second = registerFieldNavigation(() => new Promise(resolve => { finish = resolve; })); first();
  let moved = false; const pending = preserveOpenFieldDraft().then(result => { moved = result; });
  await Promise.resolve(); assert.equal(moved, false); finish(true); await pending; assert.equal(moved, true);
  second(); assert.equal(await preserveOpenFieldDraft(), true);
});

test('online account saving continues when device storage is unavailable and never claims an unsaved backup', async () => {
  const value = draft({ photos: [photo(0)] }); let backedUp = 0, warnings = 0, checkpoint;
  const fetcher = async path => path === '/api/upload' ? Response.json({ key: uuid(99) + '.jpg' }) : Response.json({ id: value.clientId, status: 'pending' });
  const result = await submitFieldDraft(value, async () => new Blob(['photo']), { fetcher, backup: async () => { backedUp++; throw new Error('QuotaExceededError'); }, onBackupUnavailable: () => warnings++, onCheckpoint: async post => { checkpoint = post; } });
  assert.equal(result.status, 'pending'); assert.equal(backedUp, 1); assert.equal(warnings, 1); assert.equal(checkpoint.photos[0].uploadedKey, uuid(99) + '.jpg');
  for (const deviceSaved of [false, true]) await assert.rejects(submitFieldDraft(draft(), async () => new Blob(), { backup: async () => { if (!deviceSaved) throw new Error('No storage'); }, fetcher: async () => { throw new TypeError('Offline'); } }), error => error.code === 'OFFLINE' && error.deviceSaved === deviceSaved);
});

test('malformed upload receipts and uncertain post acknowledgements remain retryable failures', async () => {
  await assert.rejects(publishFieldDraft(draft({ photos: [photo(1)] }), async () => new Blob(['photo']), { fetcher: async () => new Response('not json') }), error => error.code === 'UPLOAD_FAILED');
  for (const receipt of [{ id: uuid(3), status: 'draft' }, { id: uuid(2), status: 'unknown' }, null]) await assert.rejects(publishFieldDraft(draft(), async () => new Blob(), { fetcher: async () => Response.json(receipt) }), error => error.code === 'SAVE_FAILED');
});

test('availability distinguishes missing source fields from a sourced non-endemic value', () => {
  const fields = sourceCoverage([{ label: 'Endemic', value: false }, { label: 'Images', value: [] }, { label: 'Name', value: '' }, { label: 'Status', value: 'Unknown' }, { label: 'Habitat', value: 'Forest' }]);
  assert.deepEqual(fields.map(value => value.available), [true, false, false, false, true]);
});

test('private draft links are restorable, disappear on navigation and never enter indexing', () => {
  const url = siteRouteUrl(new URL('https://example.test/'), { view: 'create', deviceDraft: uuid(1) });
  assert.equal(readSiteRoute(url.searchParams).deviceDraft, uuid(1)); assert.equal(isIndexableRoute(readSiteRoute(url.searchParams)), false);
  const home = siteRouteUrl(url, { view: 'home' }); assert.equal(home.searchParams.has('deviceDraft'), false);
  const flora = readSiteRoute(new URLSearchParams('flora=2161&tab=Yaprak&q=private&from=database'));
  assert.equal(new URL(canonicalRoute(flora)).searchParams.size, 2); assert.equal(isIndexableRoute(flora), false);
  assert.equal(canonicalRoute({ view: 'home' }).endsWith('/'), true);
  assert(!jsonForHtml({ name: '</script><script>alert(1)</script>&' }).includes('<'));
  assert.equal(xmlText('a&b<c'), 'a&amp;b&lt;c'); assert.match(robotsText(false), /Disallow: \/\n/); assert.match(robotsText(true), /Sitemap:/);
});

test('social archive filters and exact post deep links round-trip without retaining unrelated species state', () => {
  const base = new URL('https://example.test/?species=cedrus-libani&flora=2161&feed=saved');
  const filtered = siteRouteUrl(base, { view: 'social', q: 'İğne yaprak', topic: 'instagram', tab: 'photo' });
  const route = readSiteRoute(filtered.searchParams);
  assert.equal(route.view, 'social'); assert.equal(route.q, 'İğne yaprak'); assert.equal(route.topic, 'instagram'); assert.equal(route.tab, 'photo');
  assert.equal(filtered.searchParams.has('species'), false); assert.equal(filtered.searchParams.has('flora'), false);
  const id = 'a'.repeat(64), exact = siteRouteUrl(filtered, { view: 'social', entry: id });
  assert.equal(readSiteRoute(exact.searchParams).entry, id); assert.equal(exact.searchParams.has('q'), false);
  assert.equal(readSiteRoute(new URLSearchParams('view=social&tab=unknown')).tab, 'all');
});

test('observations accept sourced living species and never treat families or unrelated ids as species', async () => {
  let calls = 0; const fetcher = async () => { calls++; return Response.json({ key: 999999999, rank: 'SPECIES', taxonomicStatus: 'ACCEPTED', scientificName: 'Verified taxon' }); };
  for (const id of ['gbif-4689', 'gbif-2435194', 'gbif-6', 'gbif-0', 'gbif-1/other']) assert.equal(await validLivingTaxon(id, fetcher), false);
  assert.equal(calls, 0);
  for (const id of ['gbif-5284682', 'gbif-5219404']) assert.equal(await validLivingTaxon(id, fetcher), true);
  assert.equal(calls, 0); assert.equal(await validLivingTaxon('gbif-999999999', fetcher), true); assert.equal(calls, 1);
  assert.equal(await validLivingTaxon('gbif-999999998', fetcher), false);
  assert.equal(await validLivingTaxon('gbif-999999999', async () => Response.json({ key: 999999999, rank: 'GENUS', taxonomicStatus: 'ACCEPTED', scientificName: 'Other genus' })), false);
});

test('link-only drafts preserve previews, dismissed cards and the exact attached URL through account submission',async()=>{
 const linkUrl='https://www.gbif.org/species/2685484';
 const value=draft({text:'',linkUrl,linkPreview:{url:linkUrl,title:'Cedrus libani',description:'Taxon',siteName:'GBIF'},dismissedLink:'https://example.org/'});
 validateFieldDraft(value);assert.notEqual(fieldSignature(value),fieldSignature({...value,linkUrl:''}));assert.notEqual(fieldSignature(value),fieldSignature({...value,dismissedLink:''}));
 let body;await publishFieldDraft(value,async()=>{throw Error('no photos');},{fetcher:async(_url,options)=>{body=JSON.parse(options.body);return Response.json({id:value.clientId,status:'draft'});}});
 assert.equal(body.linkUrl,linkUrl);assert.equal('linkPreview' in body,false,'metadata is re-read by the server');assert.equal(body.share,false);
 assert.throws(()=>validateFieldDraft(draft({linkUrl:'http://127.0.0.1/'})),/INVALID_LINK/);validateFieldDraft(draft({linkUrl:'https://incomplete'}),true);
});
