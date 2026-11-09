from pathlib import Path
import gzip,json,re,hashlib
p=Path('docs/evidence/m7-stasis-owner-20261109');r=json.loads(gzip.decompress((p/'original-regressions-receipt.json.gz').read_bytes()));todo=list(r['command'][3:]);seen=set();edges=[]
while todo:
 f=todo.pop()
 if f in seen:continue
 seen.add(f);text=Path(f).read_text()
 # Overapproximate every literal relative .mjs path, not merely imports.
 for rel in re.findall(r'''["'](\.[^"'\n]*\.mjs)["']''',text):
  dest=(Path(f).parent/rel).resolve();path=str(dest.relative_to(Path.cwd()))
  if dest.is_file():edges.append([f,path]);todo.append(path)
changed=r['changedInputs'];assert changed==['tests/helpers/actor-damage-parity.mjs'];assert not set(changed)&seen
missing=[f for f in seen if f not in r['inputBefore']];assert not missing,missing
assert all(r['inputBefore'][f]==r['inputAfter'][f] for f in seen)
log=gzip.decompress((p/'original-regressions.log.gz').read_bytes()).decode();summary={k:re.findall(r'^[#ℹ] '+k+r' (.+)$',log,re.M)[-1]for k in ['tests','pass','fail','cancelled','skipped','duration_ms']};assert summary['tests']==summary['pass']=='4' and summary['fail']==summary['cancelled']==summary['skipped']=='0'
out={'scope':'Supplementary audit of the broad pre/post capture, without rerunning unchanged gameplay. Original raw receipt remains unchanged, including its false superset identity flag.','summary':summary,'unrelatedChangedInputs':changed,'changedHelperReason':'Historical Actor damage replay adaptation was concurrent; none of these four original JS fixtures or their transitive static module literals references that helper.','staticModuleLiteralClosure':sorted(seen),'staticEdges':edges,'allStaticClosureHashesUnchanged':True,'allOtherCapturedInputsUnchanged':True,'capturedInputCount':len(r['inputBefore']),'limitations':'Static literal closure is not a runtime module-loader trace. The four original wrappers invoke only their specified unchanged Lua files; all production Lua, all raw Lua fixtures, data/generated Lua, scripts, fixtures and other helper bytes were equal in the overbroad capture. No Full or device assertion.','originalReceiptSha256':hashlib.sha256((p/'original-regressions-receipt.json.gz').read_bytes()).hexdigest(),'archivedRunnerSha256':hashlib.sha256((p/'original-regressions-runner.py').read_bytes()).hexdigest()}
(p/'original-regressions-input-audit.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items()if k not in ['staticModuleLiteralClosure','staticEdges']},indent=2));print('closure',len(seen))
