from pathlib import Path
import subprocess,json,hashlib,datetime
root=Path(__file__).resolve().parents[3]
ours='d21be2fb2d84f68767c3b1ef827b61a2b63aa323';upstream='841510b78172b923b1a613216b5c3dcb2c3e062e';base='fb04fd36ab4fbdba71c0da08bf71d2899143f69b'
def git(*args):return subprocess.check_output(['git',*args],cwd=root)
def tree(ref):
 out={}
 for row in git('ls-tree','-rz',ref).split(b'\0'):
  if not row:continue
  meta,path=row.split(b'\t',1);mode,kind,sha=meta.decode().split();out[path.decode()]={'mode':mode,'type':kind,'sha':sha}
 return out
b,o,u=map(tree,[base,ours,upstream]);changedO={p for p in o if b.get(p)!=o[p]};changedU={p for p in u if b.get(p)!=u[p]};shared=changedO&changedU
expectedShared={'.gitattributes','backlog/tasks/task-74.20 - 治理阻碍角色扩展的高风险复杂度.md','tests/ci-complete-calibration.test.mjs','tests/helpers/ci-complete-calibration-source-inverse.mjs'}
assert shared==expectedShared,shared
h=lambda raw:hashlib.sha256(raw).hexdigest()
def blob(raw):return hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()
checked={}
# All non-overlapping changes, every production source, and both evidence trees retain exact bytes.
paths=(changedO|changedU|{p for p in o if p.startswith('src/lua/')})-shared
for p in sorted(paths):
 binding=u[p]if p in changedU else o[p]
 assert binding['type']=='blob'and binding['mode']=='100644',(p,binding)
 raw=(root/p).read_bytes();assert blob(raw)==binding['sha'],p
 checked[p]={'gitBlob':binding['sha'],'sha256':h(raw),'parent':upstream if p in changedU else ours}
receipts={}
for name in ['behavior-final-receipt.json','source-receipt.json','source-defect-regression-receipt.json','source-integration-receipt.json']:
 p='docs/evidence/m7-formation-20261109/'+name;d=json.loads((root/p).read_text());expected={**d.get('inputSha256',{}),**d.get('generatedInputSha256',{})}
 if d.get('testFile')and d.get('testSha256'):expected[d['testFile']]=d['testSha256']
 # Source receipts store before/after maps; current input identity is checked using the before map.
 if not expected:
  for key in ['before','inputBefore','beforeInputSha256']:
   if isinstance(d.get(key),dict):expected=d[key];break
 assert expected,p
 for f,sha in expected.items():
  raw=(root/f).read_bytes();assert h(raw if f.endswith('.gz')else raw.replace(b'\r\n',b'\n'))==sha,(p,f)
 receipts[p]={'originalReceiptSha256':h((root/p).read_bytes()),'unchangedCurrentInputs':len(expected),'claims':'Prior actual run retained by exact input identity; not rerun in this integration.'}
report={'schemaVersion':1,'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':base,'formationParent':ours,'posixParent':upstream,'formationParentTree':git('rev-parse',ours+'^{tree}').decode().strip(),'posixParentTree':git('rev-parse',upstream+'^{tree}').decode().strip(),'sharedChangedPaths':sorted(shared),'retainedPaths':checked,'receipts':receipts,'productionSources':sum(p.startswith('src/lua/')for p in checked),'limits':['No old CI result is claimed fresh or as current raw-input identity; changed CI contracts are separately executed and their historical projections verified.','No Hosted Full, admission, merge to develop, deployment or device performance claim.']}
out=root/'docs/evidence/m7-formation-posix15-20261109/retained-inputs.json';out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'retainedPaths':len(checked),'productionSources':report['productionSources'],'unchangedReceiptInputs':{p:v['unchangedCurrentInputs']for p,v in receipts.items()},'status':'PASS'},ensure_ascii=False))
