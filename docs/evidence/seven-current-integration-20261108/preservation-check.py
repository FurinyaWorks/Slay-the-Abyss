"""Verify a0 develop and 7196187 local content union without rewriting frozen evidence."""
import pathlib, subprocess, hashlib, json, re
r=pathlib.Path(__file__).resolve().parents[3]
refs={'old':'d8a57cae2a867200ca8e588abc0d368e6cdb3799','develop':'b7ed18307e0be318ccd112aaa142e5ca4c191696','local':'7196187ec1d77b519ee5b2c2e028852724c6dbce'}
def git(*args): return subprocess.check_output(['git','-C',str(r),*args])
def tree(ref):
 out={}
 for row in git('ls-tree','-r','-z',ref).split(b'\0'):
  if row:
   meta,path=row.split(b'\t',1);mode,kind,sha=meta.decode().split();out[path.decode()]=(mode,sha)
 return out
trees={k:tree(v) for k,v in refs.items()};o,a,b=[trees[k] for k in ('old','develop','local')]
shared={p for p in set(a)|set(b) if a.get(p)!=o.get(p) and b.get(p)!=o.get(p) and a.get(p)!=b.get(p)}
adapters={'.gitattributes','tests/helpers/combined-epoch/source-epoch.mjs','tests/helpers/copy-integration-source-closure.mjs','tests/helpers/reward-query-planning-contract.mjs','tests/integration-source-epoch.test.mjs','tests/watcher-actor-boundary.test.mjs'}
adapters.update(['tests/helpers/act1-choice-source-inverse.mjs', 'tests/helpers/actor-presence-source-inverse.mjs', 'tests/helpers/ci-complete-calibration-source-inverse.mjs', 'tests/helpers/colorless-catalog-source-inverse.mjs', 'tests/helpers/combined-epoch/source-epoch.mjs', 'tests/helpers/copy-integration-source-closure.mjs', 'tests/helpers/core-lifecycle-source-inverse.mjs', 'tests/helpers/defect-plan-source-inverse.mjs', 'tests/helpers/end-turn-responsibilities-source-inverse.mjs', 'tests/helpers/game-ui-extraction-source-inverse.mjs', 'tests/helpers/inventory-responsibilities-source-inverse.mjs', 'tests/helpers/m7-core-final-source-inverse.mjs', 'tests/helpers/potion-callback-source-inverse.mjs', 'tests/helpers/power-shop-source-inverse.mjs', 'tests/helpers/relic-query-source-inverse.mjs', 'tests/helpers/reward-query-boundary-source-inverse.mjs', 'tests/helpers/reward-query-planning-contract.mjs', 'tests/helpers/round3-catalog-source-inverse.mjs', 'tests/helpers/session-reward-source-inverse.mjs', 'tests/helpers/watcher-final-execution-source-inverse.mjs'])
adapters.update(['tests/defect-integration-source.test.mjs','tests/watcher-potion-integration-source.test.mjs','tests/class-potion-orb-source-inverse.test.mjs','tests/watcher-actor-source-inverse.test.mjs'])
managed=shared|adapters
preserved=[]
for p in sorted(set(a)|set(b)):
 if p in managed:continue
 av,bv,old=a.get(p),b.get(p),o.get(p)
 assert av==bv or av==old or bv==old or av is None or bv is None,('unmanaged conflict',p)
 expected=av if bv==old or bv is None else bv
 if expected is None:continue
 path=r/p
 if path.is_file():
  raw=path.read_bytes();actual=hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
 else:actual=git('rev-parse',':'+p).decode().strip()
 assert actual==expected[1],('preservation mismatch',p,expected,actual)
 preserved.append({'path':p,'gitBlob':actual})
production=[x for x in preserved if x['path'].startswith('src/lua/') and x['path'].endswith('.lua')]
assert len(production)==338
for p in sorted(p for p in shared if p.startswith('backlog/')):
 current=(r/p).read_text()
 for ref in ('develop','local'):
  text=git('show',refs[ref]+':'+p).decode()
  for label in ('PLAN','NOTES'):
   pattern='<!-- SECTION:'+label+':BEGIN -->(.*?)<!-- SECTION:'+label+':END -->'
   oldSection=re.search(pattern,text,re.S).group(1).strip();newSection=re.search(pattern,current,re.S).group(1)
   for paragraph in oldSection.split('\n\n'):assert paragraph in newSection,(ref,p,label,paragraph)
  for doc in re.findall(r'^  - (docs/.*)$',text,re.M):assert doc in current,(ref,p,doc)
 for pattern in [r'^status:.*$',r'assignee:\n(?: +.*\n)+',r'<!-- AC:BEGIN -->.*?<!-- AC:END -->']:
  before=re.search(pattern,git('show',refs['develop']+':'+p).decode(),re.M|re.S if 'AC' in pattern else re.M)
  after=re.search(pattern,current,re.M|re.S if 'AC' in pattern else re.M);assert before and after and before.group()==after.group(),(p,pattern)
report={'inputs':refs,'preservedCount':len(preserved),'productionCount':len(production),'managedSharedFiles':sorted(shared),'additionalAdapterFiles':sorted(adapters),'backlogBothSidesPreserved':True,'taskOwnerStatusAcPreserved':True,'files':preserved}
out=pathlib.Path(__file__).with_name('preservation.json');out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False,indent=2))
