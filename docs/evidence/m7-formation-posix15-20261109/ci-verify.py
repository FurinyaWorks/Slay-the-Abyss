import datetime, gzip, hashlib, json, pathlib, re, subprocess, sys
root=pathlib.Path.cwd()
# Replays must use a fresh output directory; historical receipts are immutable.
out=root/(sys.argv[1] if len(sys.argv)==2 else 'build/formation-posix15-verification-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
assert len(sys.argv)<=2, 'Usage: python ci-verify.py [new-output-directory]'
assert not out.exists(), 'Never overwrite evidence; use a new output directory'
out.mkdir(parents=True)
hash=lambda b:hashlib.sha256(b).hexdigest()
def read(p):
 b=pathlib.Path(p).read_bytes();return json.loads(gzip.decompress(b) if str(p).endswith('.gz') else b)
prior_ci=read('docs/evidence/m7-defect-cost-20261109/affected-ci-tools-receipt.json')
prior_source=read('docs/evidence/m7-defect-cost-20261109/transitive-source-contracts-receipt.json.gz')
files=prior_ci['command'][2:]+prior_source['command'][3:]
assert len(files)==len(set(files))==23
paths=sorted(set(subprocess.check_output(['git','ls-files','-z'],text=True).strip('\0').split('\0')))
inputs=[p for p in paths if p.startswith(('scripts/','tests/','config/','src/','data/','.github/')) or p in ('package.json','package-lock.json')]
inputs += ['docs/evidence/m7-formation-posix15-20261109/ci-verify.py']
snapshot=lambda:{p:hash(pathlib.Path(p).read_bytes()) for p in inputs}
before=snapshot(); started=datetime.datetime.now(datetime.timezone.utc).isoformat(); command=['node','--test','--test-concurrency=1','--test-reporter=spec',*files]
r=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT); finished=datetime.datetime.now(datetime.timezone.utc).isoformat(); after=snapshot()
log=out/'ci-selected-complete.log.gz';log.write_bytes(gzip.compress(r.stdout,mtime=0)); text=r.stdout.decode();result={k:float(v) if '.' in v else int(v) for k,v in re.findall(r'ℹ (tests|pass|fail|cancelled|skipped|todo|duration_ms) ([\d.]+)',text)}
receipt={'scope':'Complete 23-file integration boundary, original POSIX15 affected CI/delivery and source consumers. No Full or expensive Formation/Defect behavior rerun.','command':command,'status':r.returncode,'startedUtc':started,'finishedUtc':finished,'node':subprocess.check_output(['node','--version'],text=True).strip(),'parents':[subprocess.check_output(['git','rev-parse',r],text=True).strip() for r in ['HEAD','MERGE_HEAD']],'uncommittedCandidate':True,'result':result,'beforeInputSha256':before,'afterInputSha256':after,'beforeAfterHashesMatched':before==after,'logPath':str(log.relative_to(root)),'logSha256':hash(r.stdout),'compressedLogSha256':hash(log.read_bytes()),'notRun':['Hosted Windows/POSIX Full37','Unchanged PowerShell ci-downloads suite, original #574 failure retained; pwsh not installed','Broad 91-file transitive source closure','Formation behavior/source expensive VMs: inputs authenticated instead; saved complete runs are not current reruns']}
(out/'ci-selected-complete-receipt.json.gz').write_bytes(gzip.compress((json.dumps(receipt,indent=2)+'\n').encode(),mtime=0))
print(json.dumps({k:v for k,v in receipt.items() if k not in ['beforeInputSha256','afterInputSha256']},indent=2));print(text[-7000:])
assert before==after,'verification input bytes changed during run'
sys.exit(r.returncode)
