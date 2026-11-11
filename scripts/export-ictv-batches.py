"""Export the preserved, complete MSL41 import into verified bounded data batches.

This recovery tool never modifies migration history or the source data.
For later official releases use import-ictv.py with an .json output directory.
"""
import sqlite3, pathlib, json, hashlib, collections

def export(nodes, changes, meta, version, directory):
    directory=pathlib.Path(directory); directory.mkdir(parents=True,exist_ok=True)
    ids={n['id'] for n in nodes}
    if len(ids)!=len(nodes) or any(n['parentId'] and n['parentId'] not in ids for n in nodes):
        raise ValueError('Duplicate identity or missing parent')
    by_id={n['id']:n for n in nodes}
    for n in nodes:
        seen=set(); current=n
        while current['parentId']:
            if current['id'] in seen: raise ValueError('Source cycle')
            seen.add(current['id']); current=by_id[current['parentId']]
    counts=dict(collections.Counter(n['rank'] for n in nodes))
    if counts!=meta['rankCounts'] or len(nodes)!=meta['total'] or len(changes)!=meta['historicalChanges']:
        raise ValueError('Official release counts disagree')
    chunks=[]
    groups=[{'nodes':nodes[i:i+40], 'changes':[]} for i in range(0,len(nodes),40)]
    groups += [{'nodes':[], 'changes':changes[i:i+40]} for i in range(0,len(changes),40)]
    for i,group in enumerate(groups):
        payload=json.dumps(group,ensure_ascii=False,separators=(',',':'))
        body=payload.encode('utf8')
        if len(body)>30000: raise ValueError('Batch exceeds bounded request size')
        (directory/f'{i:05}.json').write_text(payload,encoding='utf8')
        chunks.append({'index':i,'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body),'nodes':len(group['nodes']),'changes':len(group['changes'])})
    manifest={'source':'ictv','version':version,'sourceUrl':'https://ictv.global/msl','license':'CC BY 4.0','retrievedAt':nodes[0]['retrievedAt'],'meta':meta,'chunks':chunks}
    (directory/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    return manifest

if __name__=='__main__':
    root=pathlib.Path(__file__).resolve().parent.parent
    db=sqlite3.connect(':memory:')
    for file in sorted((root/'drizzle').glob('*.sql')): db.executescript(file.read_text())
    legacy=root/'data'/'taxonomy-import'/'legacy'/'0017_ictv_msl41.sql'
    seed=legacy.read_bytes()
    if hashlib.sha256(seed).hexdigest()!='97a00beb77848701e6e5e54d426e12524bbcaca2298cce91fb2f501dbf2ac52e':
        raise ValueError('Historical source seed changed')
    db.executescript(seed.decode('utf8'))
    version='MSL41.v1'
    nodes=[json.loads(r[0]) for r in db.execute('SELECT data FROM taxonomy_nodes WHERE source=? AND version=? ORDER BY key',('ictv',version))]
    changes=[{'id':r[0],'sourceId':r[1],'kind':r[2],'old':json.loads(r[3]),'new':json.loads(r[4])} for r in db.execute('SELECT id,source_id,kind,old_data,new_data FROM taxonomy_changes WHERE source=? AND version=? ORDER BY id',('ictv',version))]
    meta=json.loads(db.execute('SELECT data FROM taxonomy_releases WHERE source=? AND version=?',('ictv',version)).fetchone()[0])
    result=export(nodes,changes,meta,version,root/'data'/'taxonomy-import'/version)
    print(json.dumps({'version':version,'chunks':len(result['chunks']),**meta}))
