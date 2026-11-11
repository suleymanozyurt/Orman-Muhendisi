import urllib.request, urllib.parse,re,json,html,concurrent.futures,pathlib
root=pathlib.Path(__file__).resolve().parent.parent;cache=pathlib.Path('/tmp/orman-ngbb');cache.mkdir(exist_ok=True)
families=re.findall(r'<option value="([^"]+)"',urllib.request.urlopen('https://bizimbitkiler.org.tr/yeni/demos/technical/getFamilies.php',timeout=25).read().decode('utf-8'))
def fetch(f):
 p=cache/(f+'.html')
 if not p.exists():
  try:p.write_bytes(urllib.request.urlopen('https://bizimbitkiler.org.tr/yeni/demos/technical/doAdvanced.php?'+urllib.parse.urlencode({'selectFamilya':f,'taxonKriter':0,'trkKriter':0,'endemik':''}),timeout=25).read())
  except Exception:return []
 s=p.read_text(errors='replace');out=[]
 for tr in re.findall(r'<tr>(.*?)</tr>',s,re.S):
  cells=[html.unescape(re.sub('<[^>]*>','',v)).strip() for v in re.findall(r'<td[^>]*>(.*?)</td>',tr,re.S)]
  match=re.search(r"showDetails\('(\d+)', 'accepted'\)",tr)
  if len(cells)<3 or not match:continue
  n=cells[1];base=re.match(r'^([A-Z][a-z]+\s+[a-z][a-z-]+)',n)
  if not base:continue
  subs=re.findall(r'\b(subsp\.|var\.|f\.)\s+([a-z][a-z-]+)',n)
  canon=base.group(1)+''.join(' '+r+' '+e for r,e in subs)
  out.append((canon,{'publishedName':n,'commonName':cells[2],'nameSource':'https://bizimbitkiler.org.tr/yeni/demos/technical/getDetails.php?id='+match.group(1)+'&type=accepted','nameSourceId':int(match.group(1))}))
 return out
rows=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
 for result in ex.map(fetch,families):rows+=result
by={}
for n,row in rows:by.setdefault(n,[]).append(row)
data=json.loads((root/'app/data/tubives.json').read_text());count=0
for row in data['records']:
 matches=by.get(' '.join(row['name'].split()),[])
 # Exact canonical taxon and rank, unique published account only. Never substitute synonyms or parent taxa.
 if len(matches)==1 and matches[0]['commonName']:
  row.update(matches[0]);count+=1
data['metadata']['nameEnrichment']={'source':'Nezahat Gökyiğit Botanik Bahçesi · Bizim Bitkiler','matchedTaxa':count,'retrievedAt':'2026-09-30','method':'unique exact canonical name and rank'}
(root/'app/data/tubives.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('Name enrichment:',count,'matched; fetched families:',len(families),flush=True)
