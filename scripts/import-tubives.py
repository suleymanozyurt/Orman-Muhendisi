"""Import factual taxon fields through TÜBİVES' public search and comparison forms.
Uses two concurrent requests, persistent response caches, and validates every row.
No source photographs, descriptive articles, scripts or map imagery are copied.
"""
import concurrent.futures, datetime, hashlib, html, json, re, time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('/tmp/orman-tubives-import')
CACHE.mkdir(exist_ok=True)
BASE = 'http://194.27.225.161/yasin/tubives/'

def text(raw):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', ' ', raw))).strip()

def normalized(raw):
    return text(raw).replace(' alttür ', ' subsp. ').replace(' varyete ', ' var. ')

def parse_index(raw):
    output = []; current_family = ''
    for match in re.finditer(r'<TD COLSPAN=2><b>([^<]+)</b>|<A HREF=index.php\?sayfa=1&tax_id=(\d+)>(.*?)</A>', raw, re.I|re.S):
        if match[1]: current_family = text(match[1]); continue
        name = normalized(match[3])
        output.append({'id':int(match[2]),'name':name,'family':current_family,'genus':name.split()[0],
            'rank':'variety' if ' var. ' in name else 'subspecies' if ' subsp. ' in name else 'species',
            'source':BASE+'index.php?sayfa=1&tax_id='+match[2]})
    return output

def get(path, key, fields=None):
    saved = CACHE / (key + '.html')
    if saved.exists(): return saved.read_text()
    data = urlencode(fields).encode() if fields is not None else None
    for attempt in range(3):
        try:
            req = Request(BASE + path, data=data, headers={'User-Agent':'Orman-Muhendisi factual catalogue import'})
            with urlopen(req, timeout=25) as response: raw = response.read().decode('utf-8')
            saved.write_text(raw)
            return raw
        except Exception:
            if attempt == 2: raise
            time.sleep(.5 * (attempt + 1))

all_html = get('index.php?sayfa=hizli_ara','search-index',[('aranan','')])
declared = int(re.search(r'(\d+) taxa has been listed', all_html)[1])
tokens = re.finditer(r'<TD COLSPAN=2><b>([^<]+)</b>|<A HREF=index.php\?sayfa=1&tax_id=(\d+)>(.*?)</A>', all_html, re.I|re.S)
family = ''; rows = []
for match in tokens:
    if match[1]: family = text(match[1]); continue
    name = normalized(match[3])
    rows.append({'id':int(match[2]),'name':name,'family':family,'genus':name.split()[0],
      'rank':'variety' if ' var. ' in name else 'subspecies' if ' subsp. ' in name else 'species',
      'source':BASE+'index.php?sayfa=1&tax_id='+match[2]})
assert len(rows) == declared and len({r['id'] for r in rows}) == declared
assert all(r['family'] and r['name'] for r in rows)
by_id = {r['id']:r for r in rows}
fields = ['life','form','flowering','habitat','elevation','endemism','floristicRegion','turkeyRange','globalRange']
batches = [rows[i:i+100] for i in range(0,len(rows),100)]

def general(item):
    number,batch = item
    raw = get('index.php?sayfa=karsilastir','general-'+str(number)+('-'+hashlib.sha256(','.join(str(r['id']) for r in batch).encode()).hexdigest()[:12] if number>=1000 else ''),[('taxon[]',str(row['id'])) for row in batch]+[('tip','genel')])
    parts = re.split(r'<TR BGCOLOR=#CCDDEE>',raw,flags=re.I)[1:]
    if parts: parts[-1] = parts[-1].split('</TABLE>')[0]
    assert len(parts) == len(batch), ('comparison row count',number,len(parts),len(batch))
    updates = []
    for expected,part in zip(batch,parts):
        cells = re.split(r'<TD\b[^>]*>',part,flags=re.I)[1:]
        assert len(cells) == 10, ('comparison cells',number,len(cells))
        assert normalized(cells[0]) == expected['name'], ('comparison identity',number,expected['id'],normalized(cells[0]),expected['name'])
        updates.append((expected['id'],dict(zip(fields,[text(c) for c in cells[1:]]))))
    return updates

with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for number,updates in enumerate(pool.map(general,enumerate(batches)),1):
        for key,values in updates: by_id[key].update(values)
        if number % 20 == 0 or number == len(batches): print('general',number,'/',len(batches),flush=True)

province_html = get('index.php?sayfa=200','province-index')
provinces = dict((int(key),text(name).translate(str.maketrans({'I':'ı','İ':'i'})).lower().title().replace('I', 'İ').replace('İ', 'İ').replace('İğdır','Iğdır').replace('İsparta','Isparta')) for key,name in re.findall(r'<A href=index.php\?sayfa=210&name=(\d+)>(.*?)</a>',province_html,re.I|re.S))
grid_html = get('index.php?sayfa=300','grid-index')
grid_links = re.findall(r'(?:href|HREF)=["\']?(index.php\?sayfa=310[^\s>"\']*)',grid_html)
assert len(provinces) == 81
grids = {}
for link in grid_links:
    # Public grid links carry the Davis label directly.
    label = re.search(r'(?:name|grid)=([ABC]\d+)',html.unescape(link),re.I)
    if label: grids[label[1].upper()] = html.unescape(link)
if len(grids) != 30:
    print('GRID LINKS',grid_links[:5],flush=True)
    raise ValueError('Could not verify all 30 Davis grids')
for row in rows: row['provinces'] = []; row['grids'] = []

def distribution(item):
    kind,name,path = item
    raw = get(path,kind+'-'+str(name))
    ids = {int(v) for v in re.findall(r'tax_id=(\d+)',raw)}
    declared_match = re.search(r'(\d+)\s+(?:taxa|takson)',text(raw),re.I)
    if declared_match: assert int(declared_match[1]) == len(ids), ('distribution count',kind,name)
    return kind,name,ids,parse_index(raw)

jobs = [('province',name,'index.php?sayfa=210&name='+str(key)) for key,name in provinces.items()]
jobs += [('grid',name,path) for name,path in grids.items()]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for number,(kind,name,ids,listed) in enumerate(pool.map(distribution,jobs),1):
        for row in listed:
            if row['id'] not in by_id:
                row['provinces'] = []; row['grids'] = []
                rows.append(row); by_id[row['id']] = row
            else:
                assert by_id[row['id']]['name'] == row['name'], ('conflicting taxon name',row['id'])
                assert by_id[row['id']]['family'] == row['family'], ('conflicting family',row['id'])
        assert ids <= by_id.keys(), ('unknown taxon in distribution',kind,name)
        for key in ids: by_id[key]['provinces' if kind == 'province' else 'grids'].append(name)
        if number % 20 == 0 or number == len(jobs): print('distribution',number,'/',len(jobs),flush=True)

family_index = get('index.php?sayfa=dizin','family-index')
family_counts = {name:int(count) for name,count in re.findall(r'familya=([^>]+)>[^<]+</A>\s*\((\d+)\)',family_index,re.I)}
source_total = sum(family_counts.values())
# Four nested-rank records are absent from both search and distribution lists.
# Verify their public taxon pages before importing; never fabricate a missing ID.
if len(rows) < source_total:
    for key in range(1,max(by_id)+1):
        if key in by_id: continue
        raw = get('index.php?sayfa=1&tax_id='+str(key),'detail-'+str(key))
        family_match = re.search(r'<b>Family</b>.*?<big>(.*?)</big>',raw,re.I|re.S)
        name_match = re.search(r'<b>Taxon</b>.*?<big>(.*?)</big>',raw,re.I|re.S)
        assert family_match and name_match, ('missing public taxon page',key)
        name = normalized(re.sub(r'<small>.*?</small>','',name_match[1],flags=re.I|re.S))
        row = {'id':key,'name':name,'family':text(family_match[1]),'genus':name.split()[0],
            'rank':'variety' if ' var. ' in name else 'subspecies' if ' subsp. ' in name else 'species',
            'source':BASE+'index.php?sayfa=1&tax_id='+str(key),'provinces':[],'grids':[]}
        assert 'Taksonun il düzeyinde dağılımı bulunamadı' in raw and 'Taksonun kare düzeyinde dağılımı bulunamadı' in raw
        by_id[key] = row; rows.append(row)
extra = sorted((row for row in rows if 'life' not in row),key=lambda row:row['id'])
if extra:
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        extra_batches = [extra[i:i+100] for i in range(0,len(extra),100)]
        for updates in pool.map(general,[(1000+i,batch) for i,batch in enumerate(extra_batches)]):
            for key,values in updates: by_id[key].update(values)
assert all(all(key in row for key in fields) for row in rows)
rows.sort(key=lambda row:row['id'])
assert len(rows) == source_total
assert all(sum(row['family']==family for row in rows) == count for family,count in family_counts.items())
metadata = {'source':'TÜBİVES','sourceUrl':BASE+'index.php','importedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'sourceDeclaredSearchTaxa':declared,'sourceDeclaredHierarchyTaxa':source_total,'additionalVerifiedTaxa':len(rows)-declared,'familyCountsVerified':True,'importedTaxa':len(rows),'uniqueIds':len(by_id),'families':len({r['family'] for r in rows}),
 'provincePages':len(provinces),'gridPages':len(grids),'sourceIndexSha256':hashlib.sha256(all_html.encode()).hexdigest(),
 'ranks':{rank:sum(row['rank']==rank for row in rows) for rank in ['species','subspecies','variety']},
 'note':'Historical TÜBİVES taxon records, preserved by source ID; not a modern accepted-name checklist. No taxon photos or author citations were imported.'}
target = ROOT/'app/data/tubives.json'
target.write_text(json.dumps({'metadata':metadata,'records':rows},ensure_ascii=False,separators=(',',':')))
print(json.dumps(metadata,ensure_ascii=False),flush=True)
