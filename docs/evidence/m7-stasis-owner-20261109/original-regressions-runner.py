from pathlib import Path
import json,hashlib,subprocess,time,gzip,re
files=['tests/act2-enemies.test.mjs','tests/death-power-order.test.mjs','tests/act2-stasis-source-order.test.mjs','tests/plated-armor-queue.test.mjs']
paths=set(files)
for root in ['src/lua','data','config','scripts','tests/helpers','tests/fixtures','tests/lua','build/lua']:
 for p in Path(root).rglob('*'):
  if p.is_file() and not p.name.startswith('stasis-owner') and not p.name.startswith('stasis-ci'):paths.add(str(p))
paths.update(['package.json','package-lock.json'])
def hashes():return {p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in sorted(paths)}
before=hashes();start=time.monotonic();started=time.time();r=subprocess.run(['node','--test','--test-concurrency=1',*files],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
duration=(time.monotonic()-start)*1000;after=hashes();log=r.stdout;root=Path('docs/evidence/m7-stasis-owner-20261109');z=gzip.compress(log,mtime=0);(root/'original-regressions.log.gz').write_bytes(z)
summary={k:re.findall(rb'^# '+k.encode()+rb' (.+)$',log,re.M)[-1].decode()for k in ['tests','pass','fail','cancelled','skipped','duration_ms']if re.search(rb'^# '+k.encode()+rb' ',log,re.M)}
receipt={'command':['node','--test','--test-concurrency=1',*files],'startEpoch':started,'elapsedWallMs':duration,'exitCode':r.returncode,'summary':summary,'logSha256':hashlib.sha256(log).hexdigest(),'compressedLogSha256':hashlib.sha256(z).hexdigest(),'inputBefore':before,'inputAfter':after,'inputHashesMatch':before==after,'changedInputs':[p for p in before if before[p]!=after.get(p)],'scope':'Broad superset of production/data/static and frozen inputs; unrelated helper test files excluded by dedicated prefix. Four original complete regressions, not Full.'}
b=gzip.compress((json.dumps(receipt,indent=2)+'\n').encode(),mtime=0);(root/'original-regressions-receipt.json.gz').write_bytes(b)
print(log.decode());print(json.dumps({k:v for k,v in receipt.items()if k not in ['inputBefore','inputAfter']},indent=2));raise SystemExit(r.returncode)
