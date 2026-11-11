import test from 'node:test';
import assert from 'node:assert/strict';
import { previewUrl, firstLink, readLinkPreview } from '../app/link-preview.ts';
import { parseLinkMetadata, fetchLinkPreview, publicAddress } from '../app/link-preview-server.ts';
const dns=(address='93.184.215.14')=>Response.json({Status:0,Answer:[{type:1,data:address}]});
const html=(body)=>new Response(body,{headers:{'content-type':'text/html; charset=utf-8'}});
test('pasted links normalize punctuation and reject credentials, encoded private IPs and local destinations',()=>{
 assert.equal(firstLink('Sedir: https://www.gbif.org/species/2685484.\nNot'), 'https://www.gbif.org/species/2685484');
 for(const value of ['javascript:alert(1)','data:text/html,a','file:///etc/passwd','http://127.1','http://2130706433','http://0x7f000001','https://[::1]','https://192.168.1.3','https://foo.local','https://localhost','https://user:secret@example.org','https://example.org:8080'])assert.equal(previewUrl(value),'',value);
 assert.equal(readLinkPreview('{"url":"javascript:evil"}'),undefined);
});
test('metadata uses the original title, description and relative photo; hostile scripts and URLs stay inert',()=>{
 const result=parseLinkMetadata(`<head><!-- <meta property="og:title" content="False"> --><script>const x='<meta property="og:title" content="Script">'</script><meta content='Sedir &amp; Doğa' property='og:title'><meta name=description content="Türkiye'nin ağaçları"><meta content="../foto.jpg" property="og:image"><title>Fallback</title></head><body><meta property="og:title" content="Body"></body>`,'https://example.org/articles/a');
 assert.equal(result.title,'Sedir & Doğa');assert.equal(result.description,"Türkiye'nin ağaçları");assert.equal(result.image,'https://example.org/foto.jpg');
 assert.equal(parseLinkMetadata('<title>Başlık &#x1f33f;</title><meta property="og:image" content="javascript:alert(1)">','https://example.org/').image,undefined);
 assert.equal(parseLinkMetadata('<title>Başlık &#x1f33f;</title>','https://example.org/').title,'Başlık 🌿');
});
test('previews fetch without viewer credentials and validate each redirect and DNS answer',async()=>{
 const calls=[]; const fetcher=async(url,options)=>{calls.push([String(url),options]);if(String(url).startsWith('https://cloudflare-dns.com'))return dns();if(String(url)==='https://example.org/')return new Response(null,{status:302,headers:{location:'https://www.gbif.org/'}});return html('<meta property="og:title" content="GBIF">');};
 const result=await fetchLinkPreview('https://example.org/',fetcher,false);assert.equal(result.title,'GBIF');assert.equal(result.url,'https://example.org/');
 for(const [,options] of calls){assert(!options.headers.Authorization);assert(!options.headers.Cookie);assert(['error','manual'].includes(options.redirect));assert(options.signal);}
 let fetched=false;
 await assert.rejects(fetchLinkPreview('https://example.org/',async(url)=>{if(String(url).startsWith('https://cloudflare-dns.com'))return dns('10.0.0.8');fetched=true;return html('private');},false),/INVALID_LINK/);assert.equal(fetched,false);
 await assert.rejects(fetchLinkPreview('https://example.org/',async(url)=>String(url).startsWith('https://cloudflare-dns.com')?dns():new Response(null,{status:302,headers:{location:'http://169.254.169.254/latest/meta-data'}}),false),/INVALID_LINK/);
 for(const address of ['127.0.0.1','10.1.1.1','100.64.0.1','169.254.1.1','172.16.0.1','192.168.2.2','198.18.1.1','224.0.0.1','::1','fc00::1','fe80::1','2001:db8::1','2002:7f00:1::1'])assert.equal(publicAddress(address),false,address);
 assert.equal(publicAddress('2606:4700:4700::1111'),true);
});
test('non-HTML, redirect loops and excessive documents have bounded, recoverable outcomes',async()=>{
 await assert.rejects(fetchLinkPreview('https://example.org/',async(url)=>String(url).startsWith('https://cloudflare-dns.com')?dns():new Response('{}',{headers:{'content-type':'application/json'}}),false),/PREVIEW_UNAVAILABLE/);
 let redirects=0;await assert.rejects(fetchLinkPreview('https://example.org/',async(url)=>{if(String(url).startsWith('https://cloudflare-dns.com'))return dns();redirects++;return new Response(null,{status:302,headers:{location:'/again'}});},false),/PREVIEW_UNAVAILABLE/);assert.equal(redirects,4);
 let cancelled=false;const oversized=new ReadableStream({pull(controller){controller.enqueue(new TextEncoder().encode('a'.repeat(300000)));},cancel(){cancelled=true;}});
 const result=await fetchLinkPreview('https://example.org/',async(url)=>String(url).startsWith('https://cloudflare-dns.com')?dns():new Response(oversized,{headers:{'content-type':'text/html'}}),false);assert.equal(result.title,'example.org');assert(cancelled);
});
