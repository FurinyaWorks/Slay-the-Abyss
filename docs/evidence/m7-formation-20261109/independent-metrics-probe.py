from pathlib import Path
import json,gzip,hashlib,subprocess,tarfile,io,datetime
root=Path('docs/evidence/m7-formation-20261109')
old_path=Path('docs/evidence/m7-defect-final-20261109/current-engineering.json.gz')
new_path=root/'current-engineering.json.gz'
before=json.loads(gzip.decompress(old_path.read_bytes()));after=json.loads(gzip.decompress(new_path.read_bytes()))
h=lambda b:hashlib.sha256(b).hexdigest()
archived=subprocess.check_output(['git','archive','fb04fd36ab4fbdba71c0da08bf71d2899143f69b','src/lua'])
with tarfile.open(fileobj=io.BytesIO(archived)) as a:
 files={p.name:a.extractfile(p).read() for p in a.getmembers() if p.isfile() and p.name.endswith('.lua')}
assert len(files)==338
for report,is_old in [(before,True),(after,False)]:
 rows=report['snapshot']['modules'];assert {r['file'] for r in rows}==set(files)
 for row in rows:
  content=files[row['file']] if is_old else Path(row['file']).read_bytes()
  assert h(content.replace(b'\r\n',b'\n'))==row['sha256'],row['file']
 for path,expected in report['inputs'].items():
  if not is_old:assert h(Path(path).read_bytes().replace(b'\r\n',b'\n'))==expected,path
 assert not report['errors'];assert report['coverage']['measurements']==report['coverage']['expectedMeasurements']
assert before['tools']['parser']==after['tools']['parser']
assert {k:v for k,v in before['tools']['luacheck'].items() if k!='file'}=={k:v for k,v in after['tools']['luacheck'].items() if k!='file'}
assert before['snapshot']['contract']==after['snapshot']['contract']
assert before['snapshot']['dependencies']==after['snapshot']['dependencies']
assert before['snapshot']['cycles']==after['snapshot']['cycles']
assert before['architecture']['edges']==after['architecture']['edges']
old_modules={r['file']:r for r in before['snapshot']['modules']}
for row in after['snapshot']['modules']:
 if row['file']!='src/lua/abyss_encounter_formation.lua':assert row==old_modules[row['file']],row['file']
summary=[]
for report in [before,after]:
 funcs=[f for m in report['snapshot']['modules'] for f in m['functions']]
 summary.append({'modules':len(report['snapshot']['modules']),'measurements':len(funcs),'ccAbove30':sum(f['complexity']>30 for f in funcs),'ccAbove15':sum(f['complexity']>15 for f in funcs),'sccMembers':[len(x['members']) for x in report['snapshot']['cycles']],'dependencyPairs':len(report['snapshot']['dependencies']),'references':len(report['architecture']['edges'])})
assert summary[0]['ccAbove30']==34 and summary[1]['ccAbove30']==33
assert summary[0]['ccAbove15']==210 and summary[1]['ccAbove15']==209
result={'reviewer':'EncounterFormation independent reviewer (not the implementer)','reviewedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'Read-only verification of existing metrics, not a new whole-library collection or Full run.','baseSha':'fb04fd36ab4fbdba71c0da08bf71d2899143f69b','baselineArchive':str(old_path),'baselineArchiveSha256':h(old_path.read_bytes()),'currentArchiveSha256':h(new_path.read_bytes()),'all338BaselineSourcesReauthenticated':True,'all338CurrentSourcesReauthenticated':True,'allNonFormationModuleMeasurementsUnchanged':True,'dependencyAndCycleStructuresUnchanged':True,'baseline':summary[0],'current':summary[1]}
(root/'independent-metrics-review.json').write_text(json.dumps(result,indent=2)+'\n')
print('PASS independent metrics: complete 338-file Git base and current identities; only Formation measurements changed; exact dependency edges and SCC structure unchanged')
print(json.dumps(result,indent=2))
