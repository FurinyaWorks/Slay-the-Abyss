"""Reproduce the independent Defect execute review from repository root.
Usage: python docs/evidence/m7-defect-final-20261109/independent-probe.py --output /tmp/defect-review
Requires repository npm dependencies. Uses fresh bounded Fengari processes only.
"""
import argparse, gzip, hashlib, json, pathlib, re, subprocess, tempfile
parser=argparse.ArgumentParser();parser.add_argument('--root',type=pathlib.Path,default=pathlib.Path.cwd());parser.add_argument('--output',type=pathlib.Path,required=True);args=parser.parse_args()
root=args.root.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
harness=pathlib.Path(__file__).with_name('independent-probe.lua').read_text()
before=(root/'tests/fixtures/defect-final-execute-before.lua').read_text();current=(root/'src/lua/abyss_defect_final_cards.lua').read_text()
assert hashlib.sha256(before.encode()).hexdigest()=='df100051b93665ecc88dea658f9c3bfdf24148907fd740c50ca0166852f9be71'
assert hashlib.sha256(current.encode()).hexdigest()=='77abe4a82a37118273585830e1bd4c49e07b0367de77f06dc388b7ca862f5544'
with tempfile.TemporaryDirectory(prefix='defect-independent-') as temp:
 def run(name,source,driver):
  script=pathlib.Path(temp)/(name+'.lua');assert ']====]' not in source
  script.write_text('REVIEW_SOURCE=[====['+source+']====]\n'+driver)
  result=subprocess.run(['node',str(root/'node_modules/fengari-node-cli/src/lua-cli.js'),str(script)],cwd=root,capture_output=True,text=True,timeout=120)
  assert result.returncode==0 and not result.stderr,(name,result.returncode,result.stderr)
  # Lua error module locations are normalized by the probe itself; generated
  # harness line offsets and printed table pointers have no cross-VM identity.
  normalized=re.sub(re.escape(str(script))+r':\d+: ','review-harness: ',re.sub(r'table: 0x[0-9a-f]+','table-key',result.stdout))
  return result.stdout,normalized
 old_raw,old=run('before',before,harness);new_raw,new=run('current',current,harness)
 assert old==new,'Independent read-order/state/return mismatch'
 assert len(old.splitlines())==1898
 for name,value in [('independent-old-raw',old_raw),('independent-current-raw',new_raw),('independent-old',old),('independent-current',new)]:
  (out/(name+'.log.gz')).write_bytes(gzip.compress(value.encode(),mtime=0))
 focused=harness.replace('for variant=0,9 do local count=run(action,variant,0);for stop=1,count do run(action,variant,stop)end end','for variant=0,9 do if variant~=2 then run(action,variant,0)end end')
 # Two nonzero cards make reverse discard queue order observable.
 focused=focused.replace('return sb.hand end,',"return {card2,card,{uid='third',combatCost=3}} end,")
 _,control=run('control',current,focused);mutations={}
 for name,old_text,new_text in [
  ('single-created','actions.created(combat,state,card);actions.created(combat,state,card)','actions.created(combat,state,card)'),
  ('recycle-tuple',"then return require('abyss_hand_choice').begin","then require('abyss_hand_choice').begin"),
  ('scrape-order','for i=#discard,1,-1 do','for i=1,#discard do'),
  ('fission-slots','for _=1,state.orbs.slots do','for _=1,#state.orbs.balls do'),
  ('action-reread',"if action=='white_noise'then","if effect.action=='white_noise'then")]:
  assert current.count(old_text)==1
  _,mutant=run(name,current.replace(old_text,new_text),focused)
  assert len(control.splitlines())==len(mutant.splitlines())
  differences=[a.split('|')[0]for a,b in zip(control.splitlines(),mutant.splitlines())if a!=b]
  assert differences,name+' survived';mutations[name]={'killed':True,'differentRows':differences}
 (out/'independent-mutations.json').write_text(json.dumps(mutations,indent=2)+'\n')
 summary={'pairedExecutions':1898,'scenarioConfigurations':130,'matching':True,'mutantsKilled':len(mutations),'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.iterdir())if p.is_file()}}
 (out/'independent-probe-result.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary))
