import assert from "node:assert/strict";
import test from "node:test";

test('discovery renders seven ITIS kingdoms, independent viruses and preserves existing family/genus surfaces',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 for(const [query,labels] of [['view=discover',['Taksonomi','Plantae','Fungi','Animalia','Chromista','Protozoa','Bacteria','Archaea','Türkiye’nin Ağaçları','Türkiye’nin Endemik Bitkileri']],['view=discover&entry=gbif-4689',['Kayıngiller','Quercus','Fagus','Castanea','life-breadcrumb','life-branch-rail']],['view=discover&entry=gbif-2435194&tab=classification',['Panthera','Chordata','Mammalia','Carnivora','Felidae','life-classification']]]){
  const response=await worker.fetch(new Request('http://localhost/?'+query,{headers:{accept:'text/html'}}),env,ctx);assert.equal(response.status,200);const html=await response.text();for(const label of labels)assert(html.includes(label),label);assert(html.includes('Tür veya grup ara'));assert.match(html,/nav-item-sidebar current[^]*?aria-current="page"/);
  if(query==='view=discover'){
   assert(html.includes('class="taxonomy-kingdom-bar"'));
   assert.equal((html.match(/aria-controls="[^"]+"/g)||[]).length>7,true);
   for(const label of ["Taksonomi","Virüsler","Arama filtreleri","tx-view-list"])assert(html.toLowerCase().includes(label.toLowerCase()),label);
   assert(!html.includes("life-more-groups"),"all seven kingdoms have direct visible entries");
   assert(!html.includes('class="tx-workspace'),"kingdoms appear once, without an empty tree/list/profile workspace");
   assert(!html.includes('class="tx-summary'),"root landing has no empty taxon profile");
   assert(html.indexOf('class="tx-search"')<html.indexOf('class="taxonomy-kingdom-bar"'),"kingdoms appear directly beneath the search");
   assert(html.indexOf('class="taxonomy-kingdom-bar"')<html.indexOf('class="tx-toolbar"'),"kingdoms precede source and view controls");
   for(const label of ['Bitki bakımı','Bitki sağlığı','Ormancılık','Paylaşımlarımız','Fidanlıklar'])assert(html.includes(label),label);
  }else for(const label of ['Genel Bakış','Sınıflandırma','Türler','Dağılım','Harita','Görseller','Kaynaklar'])assert(html.includes(label),label);
 }
});

test('tree root is a single classification surface and selected taxa expose quick actions before child lists',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 const render=async(query)=>{const response=await worker.fetch(new Request('http://localhost/?'+query,{headers:{accept:'text/html'}}),env,ctx);assert.equal(response.status,200);return response.text();};
 const tree=await render('view=discover&treeMode=tree');
 assert(tree.includes('tx-root-workspace'));assert(tree.includes('ICTV sınıflandırması'));
 assert(!tree.includes('class="tx-kingdoms"'));assert(!tree.includes('class="tx-children"'));assert(!tree.includes('class="tx-summary"'));
 const selected=await render('view=discover&treeSource=itis&treeId=202422&treeVersion=live');
 assert(selected.includes('Plantae'),'selected name is available before the detail request finishes');
 assert(selected.includes('class="tx-quick-actions"'));
 assert(selected.indexOf('class="tx-summary"')<selected.indexOf('class="tx-children"'),'mobile details and actions are not buried after paginated child lists');
 assert(selected.includes('tx-profile'));assert(!selected.includes('class="tx-kingdoms"'));
});

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("production document omits temporary development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.doesNotMatch(await response.text(), developmentPreviewMeta);
});

test("taxon links render titles, descriptions and social metadata for their own record",async()=>{
 const {default:worker}=await import(new URL("../dist/server/index.js",import.meta.url).href);
 for(const [id,name] of [[2161,"Linum mucronatum"],[9932,"Triticum baeoticum"]]){
  const response=await worker.fetch(new Request(`http://localhost/?view=flora-record&flora=${id}`,{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200);const html=await response.text();
  assert.match(html,new RegExp(`<title>[^<]*${name}`));
  for(const tag of ["og:title","og:description","twitter:title","twitter:description"]){assert.match(html,new RegExp(`<meta[^>]*(?:property|name)="${tag}"[^>]*content="[^"]*${name}`));}
  assert.doesNotMatch(html,/<meta[^>]*(?:property|name)="(?:og:image|twitter:image)"/);
 }
});

test('direct section links render the requested working surface and complete navigation', async () => {
 const {default: worker} = await import(new URL('../dist/server/index.js', import.meta.url).href);
 for (const [query, heading] of [['view=library','Fotoğraflı tür künyeleri.'],['view=glossary&q=Familya','Botanik sözlük'],['view=detail&species=cedrus-libani','Lübnan sediri'],['view=map&map=community','Topluluk haritası'],['view=global-species&taxon=Monstera%20deliciosa','Monstera deliciosa'],['view=compare&compare=cedrus-libani,pinus-pinea','Türleri karşılaştır'],['view=profile','Gözlemlerim']]) {
  const response = await worker.fetch(new Request(`http://localhost/?${query}`,{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
  assert.equal(response.status,200, query); const html=await response.text();
  assert.ok(html.includes(heading), `Expected ${heading} for ${query}`);
  for (const section of ['home','discover','database','library','map','glossary','care','collections','profile']) assert.ok(html.includes(`href="?view=${section}"`), `Missing ${section} navigation`);
  assert.ok(html.includes('id="menu-dialog-title"')); assert.ok(html.includes('id="search-dialog-title"'));
 }
});

test('assistant and primary navigation render direct working controls and standalone metadata',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};const ctx={waitUntil(){},passThroughOnException(){}};
 const response=await worker.fetch(new Request('http://localhost/?view=assistant&q=L%C3%BCbnan%20sediri',{headers:{accept:'text/html'}}),env,ctx);assert.equal(response.status,200);const html=await response.text();
 for(const text of ['Bitki asistanı','assistant-question','data-dock-tab="home"','data-dock-tab="discover"','data-dock-tab="create"','data-dock-tab="map"','data-dock-tab="database"','mobile-profile-trigger','manifest.webmanifest','viewport-fit=cover','apple-mobile-web-app-capable'])assert(html.includes(text),text);
 assert(html.includes('Lübnan sediri'));
});
test('shared catalogue links preserve every selected province on the server render',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('http://localhost/?view=database&provinces=Antalya&provinces=Mersin&layout=cards',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 const html=await response.text();assert.equal(response.status,200);assert(html.includes('Filtreyi kaldır: Antalya'));assert(html.includes('Filtreyi kaldır: Mersin'));assert(html.includes('catalog-results cards'));
});

test('care opens directly as a working surface with real calendar and plant controls',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const res=await worker.fetch(new Request('http://localhost/?view=care',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 const html=await res.text();assert.equal(res.status,200);for(const label of ['Bitkilerim','Takvim','Bugün','Bitki ekle','care-workspace','care-sheet','data-dock-tab="create"'])assert(html.includes(label),label);assert(!html.includes('care-workspace" hidden'));
});

test('new sections render direct app surfaces, accessible theme choices and complete menu links',async()=>{const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);for(const [view,label] of [['birds','Kuşlar'],['health','Bitki sağlığı'],['fungi','Mantarlar alemi'],['nature','Doğa gözlemleri'],['forestry','Ormancılık'],['publications','Bilimsel'],['nurseries','Fidanlık'],['store','Kitap']]){const response=await worker.fetch(new Request('http://localhost/?view='+view,{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});const html=await response.text();assert.equal(response.status,200,view);assert(html.includes(label),label);for(const section of ['birds','health','fungi','nature','forestry','publications','nurseries','store'])assert(html.includes('href="?view='+section+'"'),section);for(const text of ['Renk teması','Sistem','Açık','Koyu','prefers-color-scheme','om.theme','Menüde bölüm ara'])assert(html.includes(text),text);}});

test('regional controls, follow stories, account settings and floating chat render usable initial surfaces',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}};const ctx={waitUntil(){},passThroughOnException(){}};
 for(const [query,strings] of [['view=map',['atlas-canvas','Dünya haritası','region-search','role="combobox"','Harita filtreleri','Konumuma göre çevredeki türleri göster','Haritadan nokta seç','Türleri keşfet']],['view=home',['Takip ettiklerin','Kişileri keşfet','people-title','story-section','chat-launcher','plant-chat']],['view=fungi',['Mantarlar alemi','Amanita muscaria','Trametes versicolor','Familya','Seçili türler']],['view=profile',['Kişisel ayarlar','Otomatik · bulunduğum ülkeye göre','Site dili','Renk teması']]]){
  const response=await worker.fetch(new Request(`http://localhost/?${query}`,{headers:{accept:'text/html'}}),env,ctx);assert.equal(response.status,200);const html=await response.text();for(const string of strings)assert(html.includes(string),`${query}: ${string}`);
  const header=html.match(/<header class="global-header">([\s\S]*?)<\/header>/)?.[1]||'';assert(!header.includes('theme-picker'));assert(!header.includes('language-switch'));assert(!header.includes('header-assistant'));
 }
});

test('account access exposes honest provider availability and preserves the working account session',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 for(const [country,mode,title] of [['TR','signin','Yeniden hoş geldin'],['TR','signup','Aramıza katıl'],['GB','signin','Welcome back']]){
  const response=await worker.fetch(new Request(`http://localhost/?view=auth&tab=${mode}`,{headers:{accept:'text/html','cf-ipcountry':country}}),env,ctx);
  assert.equal(response.status,200);const html=await response.text();assert(html.includes(title));
  for(const provider of ['Google','Facebook','Apple','Microsoft'])assert(html.includes(provider),provider);
  assert(html.includes('signin-with-chatgpt?return_to=%2F%3Fview%3Dprofile'));
  assert(html.includes(country==='TR'?'Bu giriş seçenekleri henüz etkin değil':'These sign-in options are not enabled'));
 }
 const response=await worker.fetch(new Request('http://localhost/?view=account',{headers:{accept:'text/html','oai-authenticated-user-id':'test-user','oai-authenticated-user-email':'test@example.com'}}),env,ctx);
 assert.equal(response.status,200);const html=await response.text();
 for(const text of ['account-display-name','Profil bilgileri','Değişiklikleri kaydet','signout-with-chatgpt?return_to=%2F','Çıkış yap','Site dili','Renk teması'])assert(html.includes(text),text);
});

test('the initial document language matches the country or device-language fallback before hydration',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 for(const [country,locale,language] of [['TR','en-US','tr'],['DE','tr-TR','en'],['XX','en-GB','en'],['','tr-TR','tr']]){
  const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html','cf-ipcountry':country,'accept-language':locale}}),env,ctx);
  assert.equal(response.status,200);assert.match(await response.text(),new RegExp(`<html[^>]*lang="${language}"`));
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
  assert(response.headers.get('content-security-policy').includes("object-src 'none'"));
 }
});

test('flora pages include the actual initial profile, canonical identity and structured taxon data',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('https://example.test/?view=flora-record&flora=2161&tab=K%C3%BCnye&from=database',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal(response.status,200);const html=await response.text();
 assert(html.includes('Takson künyesi'));assert(html.includes('Linum mucronatum'));assert(html.includes('Bilgi kapsamı'));assert(html.includes('Kaynakta var'));
 assert.match(html,/<link[^>]*rel="canonical"[^>]*href="https:\/\/ormanmuhendisi\.suleymanozyurt49\.chatgpt\.site\/\?view=flora-record(?:&amp;|&)flora=2161"/);
 const json=JSON.parse(html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)[1]);assert.equal(json[0]['@type'],'Taxon');assert.equal(json[0].identifier,'flora-2161');assert.equal(json[0].name,'Linum mucronatum subsp. gypsicola var. gypsicola');
 assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
});

test('source breadcrumbs and species observation actions survive direct taxonomy links',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('https://example.test/?view=discover&entry=gbif-5219404',{headers:{accept:'text/html','cf-ipcountry':'GB'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 const html=await response.text();assert.equal(response.status,200);assert.match(html,/<title>[^<]*Panthera leo/);assert(html.includes('Through the community'));assert(html.includes('Add observation'));assert(html.includes('Information coverage'));
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">([^]*?)<\/script>/)[1]);assert.equal(data[0].taxonRank,'species');assert.equal(data[0].identifier,'gbif:5219404');assert.equal(data[1]['@type'],'BreadcrumbList');assert(data[1].itemListElement.some(item=>item.name==='Felidae'));
});

test('server guards cross-origin mutations and exposes indexing files without exposing private routes',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 for(const headers of [{origin:'https://other.test'},{'sec-fetch-site':'cross-site'}])assert.equal((await worker.fetch(new Request('https://example.test/api/state',{method:'POST',headers,body:'{}'}),env,ctx)).status,403);
 assert.equal((await worker.fetch(new Request('https://example.test/api/upload',{method:'POST',headers:{'content-length':'5000000'},body:'x'}),env,ctx)).status,413);
 assert.equal((await worker.fetch(new Request('https://example.test/api/source-archive',{method:'POST',headers:{'content-length':'8388608'},body:'x'}),env,ctx)).status,404);
 assert.equal((await worker.fetch(new Request('https://example.test/api/source-archive',{method:'POST',headers:{'content-length':'33554433'},body:'x'}),env,ctx)).status,413);
 const robots=await worker.fetch(new Request('https://example.test/robots.txt'),env,ctx);assert.equal(robots.status,200);assert.match(await robots.text(),/Disallow: \/\n/);
 const sitemap=await worker.fetch(new Request('https://example.test/sitemap.xml'),env,ctx);assert.equal(sitemap.status,200);assert.equal((await sitemap.text()).includes('<url>'),false);
});

test('private indexing cannot be enabled by client headers; a deliberate public configuration generates bounded sitemaps',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 const malicious=await worker.fetch(new Request('https://example.test/robots.txt',{headers:{'x-orman-public-indexing':'1'}}),env,ctx);assert.match(await malicious.text(),/Disallow: \/\n/);
 const publicEnv={...env,SITE_PUBLIC_INDEXING:'true'};
 const index=await worker.fetch(new Request('https://example.test/sitemap.xml'),publicEnv,ctx);assert.equal(index.status,200);assert((await index.text()).includes('<sitemapindex'));
 const page=await worker.fetch(new Request('https://example.test/sitemap.xml?page=0'),publicEnv,ctx);assert.equal(page.status,200);const xml=await page.text();assert.equal((xml.match(/<url>/g)||[]).length,2000);assert(!xml.includes('view=profile'));assert(!xml.includes('view=create'));
 assert.equal((await worker.fetch(new Request('https://example.test/sitemap.xml?page=-1'),publicEnv,ctx)).status,404);
});

test('flora profile tabs restore the requested source-specific panel before hydration',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('https://example.test/?view=flora-record&flora=2161&tab=Yaprak',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 const html=await response.text();assert.equal(response.status,200);assertSpeciesTabs(html,2);assert(html.includes('Bu taksona ait doğrulanmış açıklama kaynaklarda bulunamadı.'));
});

test('site and independently shareable observations carry their own social metadata and canonical links',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 const pages=[
  ['','Bitkinin sosyal hali','/brand/orman-emblem.png'],
  ['view=home&observation=editorial','Doğa gözlemi','/species/'],
  ['view=social&entry=source-x-1210617713313402889','Ağacın yapısını anlamak',null],
  ['view=home&observation=33333333-3333-4333-a333-333333333333','Gözlem yüklenemedi',null]
 ];
 for(const [query,title,image] of pages){
  const response=await worker.fetch(new Request('http://localhost/?'+query,{headers:{accept:'text/html'}}),env,ctx);assert.equal(response.status,200);const html=await response.text();
  assert(html.includes(title),title);assert(html.includes('https://ormanmuhendisi.suleymanozyurt49.chatgpt.site/'));
  const tags=html.match(/<meta[^>]+>/g)||[];const imageTags=tags.filter(tag=>/property="og:image"|name="twitter:image"/.test(tag));
  if(image)assert(imageTags.length>=2,'both Open Graph and X images present');else assert.equal(imageTags.length,0,'records without photos never inherit a site or unrelated image');
  if(query.includes('observation=editorial')){assert(html.includes('Bir sediri tanırken'));assert(html.includes('observation=editorial'));}
  if(query.includes('33333333'))assert(!html.includes('Forged title'));
 }
});


function assertSpeciesTabs(html,index){
 const tabs=(html.match(/<button\b[^>]*role="tab"[^>]*>/g)||[]).filter(tag=>/aria-controls="(?:flora|life|species)-/.test(tag));
 assert.equal(tabs.length,7);
 const id=tag=>tag.match(/\bid="([^"]+)"/)[1],controls=tag=>tag.match(/aria-controls="([^"]+)"/)[1];
 assert.equal(new Set(tabs.map(id)).size,7);
 for(const [i,tag] of tabs.entries()){
  assert(tag.includes(`aria-selected="${i===index}"`));
  assert(tag.includes(`tabindex="${i===index?0:-1}"`));
  assert.equal(controls(tag),controls(tabs[0]));
 }
 const panel=(html.match(/<div\b[^>]*role="tabpanel"[^>]*>/g)||[]).find(tag=>id(tag)===controls(tabs[0]));
 assert(panel,'the declared panel exists');
 assert(panel.includes(`aria-labelledby="${id(tabs[index])}"`));
}

test('species pages expose one keyboard entry and a labelled panel for restored tabs, including unsupported links',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 for(const [query,index] of [['view=detail&species=cedrus-libani&tab=Yaprak',2],['view=detail&species=cedrus-libani&tab=unknown',0],['view=discover&entry=gbif-5219404&tab=classification',1]]){
  const response=await worker.fetch(new Request('http://localhost/?'+query,{headers:{accept:'text/html'}}),env,ctx);
  assert.equal(response.status,200);assertSpeciesTabs(await response.text(),index);
 }
});

test('catalogues and personal settings have direct menu links and private management stays hidden',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('http://localhost/?view=catalogs',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal(response.status,200);const html=await response.text();
 assert.match(html,/<a[^>]*href="\?view=catalogs"[^>]*aria-current="page"/);
 for(const view of ['account','assistant','social'])assert(html.includes(`href="?view=${view}"`));
 assert(!html.includes('href="?view=admin"'));
 const menu=html.match(/<dialog[^>]*id="site-menu"[^]*?<\/dialog>/)?.[0];
 assert(menu);
 for(const view of ['home','discover','database','map','catalogs','gbif','nature','fungi','birds','care','health','forestry','publications','library','glossary','social','store','nurseries','collections','profile','account','assistant']){
  assert.equal((menu.match(new RegExp(`href="\\?view=${view}"`,'g'))||[]).length,1,`${view} has one menu destination`);
 }
 const groups=menu.match(/<details[^>]*class="section-menu-group"[^>]*>[^]*?<\/details>/g)||[];
 assert.equal(groups.length,3,'explore, database and personal controls remain available');
 for(const group of groups)assert.match(group,/<summary[^>]*id="[^"]+"/,'native category controls support keyboard and touch');
 const expanded=groups.filter(group=>/^<details[^>]*\sopen(?:=""|="true")?(?:\s|>)/.test(group));
 assert.equal(expanded.length,1,'only the current category starts expanded');
 assert(expanded[0].includes('href="?view=catalogs"'));
 const header=menu.match(/<div class="section-directory-header"[^]*?<nav class="section-shortcuts"[^]*?<\/nav>/)?.[0];
 assert(header,'search and main navigation are in the fixed menu header');
 for(const view of ['home','discover','database','map'])assert(header.includes(`href="?view=${view}"`));
 assert(menu.includes('section-directory-body'));
 assert(menu.includes('social-connections-compact'));
});

test('field workspace puts search first, then direct actions and optional research tools',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 const html=await response.text();assert.equal(response.status,200);
 for(const text of ['home-intro-title','Doğayı keşfet.','Taksonomi','Harita','Fotoğrafla tanı','Doğadan gelenler','Soru sor','Araştırma ve saha'])assert(html.includes(text),text);
 const intro=html.match(/<section class="home-intro field-home"[^]*?<\/section>/)?.[0];assert(intro);
 for(const view of ['discover','flora','map','forestry','gbif','compare'])assert(intro.includes(`href="?view=${view}"`),view);
 assert(intro.includes('name="question"'));assert(intro.includes('type="submit" disabled=""'));assert(intro.includes('aria-label="Soruyu gönder"'));
 assert(intro.indexOf('class="field-search"')<intro.indexOf('class="field-tasks"'));
 assert(intro.includes('<details>'), 'research and assistant open on demand');
 assert(html.indexOf('home-intro-title')<html.indexOf('class="social-home"'));
 assert(html.includes('role="combobox"'),'search keeps autocomplete semantics');
 assert(html.includes('data-dock-tab="database"'),'database stays in primary mobile navigation');
 assert(html.includes('aria-label="Profilim"'),'profile remains directly accessible');
 assert(html.includes('Fotoğraf')&&html.includes('CC BY'),'featured photograph keeps attribution');
 assert.doesNotMatch(html,developmentPreviewMeta);
});

test('search is a real results surface with immediately available Turkish species matches',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const response=await worker.fetch(new Request('http://localhost/?view=search&q='+encodeURIComponent('Lübnan sediri'),{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});
 assert.equal(response.status,200);const html=await response.text();
 for(const text of ['Arama sonuçları','Lübnan sediri','Cedrus libani','Catalogue of Life','Türkiye florası','GBIF'])assert(html.includes(text),text);
 assert(html.includes('class="unified-results"'));assert(html.includes('class="results-search"'));
});

test('legacy life root opens taxonomy and visual Explore has its own photo surface',async()=>{
 const {default:worker}=await import(new URL('../dist/server/index.js',import.meta.url).href);
 const env={ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},ctx={waitUntil(){},passThroughOnException(){}};
 for(const [route,surface] of [['view=discover&entry=life&tab=overview','taxonomy-kingdom-bar'],['view=explore','discover-workspace']]){
  const response=await worker.fetch(new Request('http://localhost/?'+route,{headers:{accept:'text/html'}}),env,ctx);assert.equal(response.status,200);const html=await response.text();assert(html.includes(surface));assert(html.includes('Taksonomi'));assert(html.includes('Keşfet'));
 }
});
