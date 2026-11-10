import json,pathlib,gzip,hashlib,math
sha=lambda b:hashlib.sha256(b).hexdigest()
base=pathlib.Path('docs/evidence/m7-map-optimized-cost-20261110')
registry=json.load(open('tests/fixtures/map-optimized-cost-registration.json'))
rows=json.load(open(base/'calibration-complete-observations.json'))['rows']
final=base/'final-accounting-validation.json'
last=json.load(open(final));last=last[0] if isinstance(last,list) else last['rows'][0]
for row in rows+[last]:
 assert row['returncode']==0 and row['inputsMatched'] and not row['changedInputs']
 assert [row['summary'][k] for k in ['tests','pass','fail','cancelled','skipped']]==[53,53,0,0,0]
 def unpack(e):
  if 'publishedPath' in e:
   packed=pathlib.Path(e['publishedPath']).read_bytes();assert sha(packed)==e['publishedGzipSha256']
   raw=gzip.decompress(packed);assert sha(raw)==e['publishedUncompressedSha256']
   assert sha(raw)==e.get('uncompressedSha256',e['sha256'])
   return raw
  b=pathlib.Path(e['path']).read_bytes();assert sha(b)==e['sha256']
  if 'uncompressedSha256' in e:b=gzip.decompress(b);assert sha(b)==e['uncompressedSha256']
  return b
 log=unpack(row['log']).decode();before=unpack(row['before']);after=unpack(row['after']);assert before==after
 assert len(json.loads(before))==row['before']['files']
 for k,v in row['summary'].items():assert 'ℹ '+k+' '+str(int(v) if v==int(v) else v) in log
floor=registry['calibrationEntry']['durationMs'];maximum=max(r['processWallMs'] for r in rows)
assert floor==max(17544,math.ceil(maximum*1.1))==20296
assert maximum<last['processWallMs']<floor
print(json.dumps({'candidateRows':len(rows),'selectionMaximumMs':maximum,'registeredFloorMs':floor,'finalWallMs':last['processWallMs'],'finalInputs':last['before']['files'],'finalReceipt':str(final),'allHashesAndSummaries':'pass'}))
