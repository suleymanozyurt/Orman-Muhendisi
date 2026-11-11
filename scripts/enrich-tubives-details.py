"""Verify factual fields from original TÜBİVES pages, with two requests at a time.
Cache raw pages outside source and checkpoint verified records every 250 pages.
No photos, advertisements, site design or article text are copied.
"""
import argparse,concurrent.futures,datetime,html,json,re,time
from pathlib import Path
from urllib.request import Request,urlopen
ROOT=Path(__file__).resolve().parents[1]
CACHE=Path('/tmp/orman-tubives-import');CACHE.mkdir(exist_ok=True)
base='http://194.27.225.161/yasin/tubives/'
data=json.loads((ROOT/'app/data/tubives.json').read_text())
def text(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',s))).strip()
def normalize(s):return s.replace(' alttür ',' subsp. ').replace(' varyete ',' var. ')
def fetch(row):
 path=CACHE/f"detail-{row['id']}.html"
 if path.exists():raw=path.read_text()
 else:
  for attempt in range(3):
   try:
    raw=urlopen(Request(row['source'],headers={'User-Agent':'Orman Muhendisi factual catalogue verification'}),timeout=20).read().decode('utf-8');path.write_text(raw);break
   except Exception:
    if attempt==2:raise
    time.sleep(1)
 family=re.search(r'<b>Family</b>.*?<big>(.*?)</big>',raw,re.I|re.S)
 taxon=re.search(r'<b>Taxon</b>.*?<big>(.*?)</big>',raw,re.I|re.S)
 assert family and taxon,(row['id'],'missing identity')
 canonical=normalize(text(re.sub(r'<small>.*?</small>','',taxon[1],flags=re.I|re.S)))
 assert canonical==row['name'] and text(family[1])==row['family'],(row['id'],'identity mismatch',canonical,row['name'])
 hierarchy=[]
 part=raw.split('Taxonomic Hierarchy')[1].split('General Taxon Information')[0]
 for level,value,author in re.findall(r'(Kingdom|Subkingdom|Division|Class|Order|Family|Genus|Species|Subspecies|Variety)\s*<b><i>(.*?)</i></b>\s*<small>(.*?)</small>',part,re.I|re.S):hierarchy.append({'rank':level.lower(),'name':normalize(text(value)),'author':text(author)})
 # Some source records have no hierarchy; preserve that absence.
 conflict=bool(hierarchy) and not any(h['rank']=='family' and h['name']==row['family'] for h in hierarchy)
 general=raw.split('General Taxon Information')[1].split('Distribution of The Taxon')[0]
 facts={text(label):text(value).lstrip(':').strip() for label,value in re.findall(r'<b>([^<]+)</b>\s*<TD><SMALL>(.*?)(?=<TR>|</TABLE>)',general,re.I|re.S)}
 keys={'Ömür':'life','Yapı':'form','Çiçeklenme':'flowering','Habitat':'habitat','Yükseklik':'elevation','Endemik':'endemism','Element':'floristicRegion','Türkiye dağılımı':'turkeyRange','Genel Dağılımı':'globalRange'}
 mismatches={k:(row.get(v),facts.get(k)) for k,v in keys.items() if facts.get(k) is not None and facts[k]!=row.get(v)}
 assert not mismatches,(row['id'],'comparison mismatch',mismatches)
 return row['id'],{'sourcePublishedName':normalize(text(taxon[1])),'hierarchy':hierarchy,'lifeForm':facts.get('Hayat Formu',''),'hierarchyConflict':conflict}
parser=argparse.ArgumentParser();parser.add_argument('--cached-only',action='store_true');args=parser.parse_args()
selected=[r for r in data['records'] if (CACHE/f"detail-{r['id']}.html").exists()] if args.cached_only else data['records']
updates={};failures=[]
def checkpoint():
 checked=datetime.datetime.now(datetime.timezone.utc).isoformat()
 for row in data['records']:
  if row['id'] in updates:row.update(updates[row['id']]);row['detailCheckedAt']=checked
 verified=sum(bool(row.get('sourcePublishedName')) for row in data['records'])
 data['metadata']['detailEnrichment']={'verifiedTaxonPages':verified,'currentRunVerifiedPages':len(updates),'failedTaxonPages':len(failures),'retrievedAt':checked,'fields':['sourcePublishedName','hierarchy','lifeForm'],'comparedOriginalFields':9,'totalTaxonPages':len(data['records']),'complete':verified==len(data['records']),'sourceCheckComplete':len(updates)==len(data['records'])}
 data['metadata']['note']='Historical TÜBİVES records preserved by source ID, including original taxonomic hierarchy and author citation. Not a modern accepted-name checklist.'
 destination=ROOT/'app/data/tubives.json';temporary=destination.with_suffix('.json.tmp')
 temporary.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')));temporary.replace(destination)
def checked_fetch(row):
 try:return fetch(row),None
 except Exception as error:return None,{'id':row['id'],'reason':str(error)[:500]}
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for n,(result,error) in enumerate(pool.map(checked_fetch,selected),1):
  if result:id,update=result;updates[id]=update
  else:failures.append(error)
  if n%250==0 or n==len(selected):
   checkpoint();print('verified detail pages',len(updates),'/',len(data['records']),'failures',len(failures),flush=True)
checkpoint()
if failures:(CACHE/'verification-failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2))
print(json.dumps(data['metadata']['detailEnrichment']),flush=True)
if failures:raise SystemExit(1)
