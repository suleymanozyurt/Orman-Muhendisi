"""Validate an entire official ICTV workbook and export bounded, checksummed source data.

Usage: python scripts/import-ictv.py INPUT.xlsx OUTPUT_DIRECTORY VERSION
Requires openpyxl. No omitted rows, invented levels, or guessed official identifiers.
Data is imported after deployment; never generate seed/backfill migrations.
"""
import collections, hashlib, json, pathlib, sys, datetime
import openpyxl

def build(workbook, version):
    retrieved=datetime.datetime.now(datetime.timezone.utc).isoformat(); source_date=next(row[2].date().isoformat() for row in workbook['Version'].values if row[1]=='Date');
    sheet=workbook['MSL']; rows=iter(sheet.values); columns=list(next(rows))
    ranks=columns[1:columns.index("Species")+1]; nodes={}; species_ids=set()
    for row in rows:
        data=dict(zip(columns,row))
        if not data.get('Species'): raise ValueError('Empty species row')
        parent=None; path=[]
        for rank in ranks:
            name=data.get(rank)
            if not name: continue
            path.append([rank,name])
            sid=str(data['ICTV_ID']) if rank=='Species' else 'path-'+hashlib.sha256(json.dumps(path,ensure_ascii=False).encode()).hexdigest()[:24]
            if rank=='Species':
                if sid in species_ids: raise ValueError('Duplicate species identifier '+sid)
                species_ids.add(sid)
            key='ictv:'+version+':'+sid
            node={'key':key,'source':'ictv','id':sid,'version':version,'name':name,'rank':rank.upper(),'parentId':parent,'status':'accepted','commonNames':[],'synonyms':[], 'sourceUrl':'https://ictv.global/msl','license':'CC BY 4.0','retrievedAt':retrieved,'sourceDate':source_date,'facts':[]}
            if rank=='Species':
                node['facts']=[{'label':'ICTV ID','value':sid}]+[{'label':label,'value':str(data[label])} for label in ['Genome','Last Change','MSL of Last Change','Proposal for Last Change'] if data.get(label) is not None]
            else: node['facts']=[{'label':'Yerel ağaç kimliği','value':'MSL içindeki gerçek sınıflandırma yolundan türetilmiştir; resmî ICTV ID değildir.'}]
            if key in nodes and nodes[key]['parentId']!=parent: raise ValueError('Conflicting parent')
            nodes[key]=node; parent=sid
    counts=collections.Counter(n['rank'] for n in nodes.values())
    expected={str(row[1]).upper():row[-1] for row in list(workbook['Taxon Counts'].values)[2:] if row[1] and row[1]!='Total Taxa'}
    if any(counts[r]!=n for r,n in expected.items()): raise ValueError('Rank counts disagree: '+str((counts,expected)))
    if sum(expected.values())!=len(nodes): raise ValueError('Total mismatch')
    by_id={n['id']:n for n in nodes.values()}
    children=collections.Counter(n['parentId'] for n in nodes.values() if n['parentId'])
    for n in nodes.values():
        n['childCount']=children[n['id']]
        seen=set(); cursor=n
        while cursor['parentId']:
            if cursor['id'] in seen: raise ValueError('Cycle')
            seen.add(cursor['id']); cursor=by_id[cursor['parentId']]
    changes=[]
    for i,row in enumerate(list(workbook['Taxa Renamed or Abolished'].values)[1:]):
        if not any(v is not None for v in row): continue
        sid,rank,kind,old,new,proposal=row
        if not kind or not old: raise ValueError('Incomplete change row')
        if rank!='Species' and new:
            candidates=[n for n in nodes.values() if n['rank']==str(rank).upper() and n['name']==str(new)]
            if len(candidates)==1: sid=candidates[0]['id']
        changes.append({'id':f'ictv:{version}:historical:{i}','sourceId':str(sid) if sid else None,'kind':kind,'old':{'name':old,'rank':rank,'proposal':proposal},'new':{'name':new,'rank':rank,'proposal':proposal}})
    return list(nodes.values()), changes, dict(counts)

def quote(v): return 'NULL' if v is None else "'"+str(v).replace("'","''")+"'"
def sql_rows(stream, table, columns, rows):
    prefix='INSERT OR IGNORE INTO '+table+' ('+','.join(columns)+') VALUES '
    batch=[]; size=0
    for row in rows:
        value='('+','.join(quote(v) for v in row)+')'
        if size+len(value.encode())>65000 and batch:
            stream.write(prefix+','.join(batch)+';\n--> statement-breakpoint\n'); batch=[]; size=0
        batch.append(value);size+=len(value.encode())
    if batch: stream.write(prefix+','.join(batch)+';\n--> statement-breakpoint\n')

if __name__=='__main__':
    import runpy
    input_file,output,version=sys.argv[1:]
    if pathlib.Path(output).suffix=='.sql': raise ValueError('Data backfills must not be placed in schema migrations')
    workbook=openpyxl.load_workbook(input_file,read_only=True,data_only=True)
    nodes,changes,counts=build(workbook,version)
    meta={'rankCounts':counts,'species':counts['SPECIES'],'total':len(nodes),'historicalChanges':len(changes),'doi':next(str(row[2]) for row in workbook['Version'].values if row[1]=='DOI:'),'file':'https://ictv.global/sites/default/files/MSL/'+pathlib.Path(input_file).name,'missingParents':0,'duplicates':0,'cycles':0}
    export=runpy.run_path(str(pathlib.Path(__file__).with_name('export-ictv-batches.py')))['export']
    manifest=export(nodes,changes,meta,version,output)
    root=pathlib.Path(__file__).resolve().parent.parent
    (root/'data'/'taxonomy-import'/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    print(json.dumps(meta,ensure_ascii=False))
