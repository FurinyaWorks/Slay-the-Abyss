from pathlib import Path
import subprocess,json
p=Path('src/lua/abyss_battle_card_view.lua')
original=p.read_text()
needle="if Theme.presentationProfile=='official-assets-first' then"
assert original.count(needle)==2
results=[]
try:
 for index in range(2):
  for value in ('true','false'):
   chunks=original.split(needle)
   mutant=chunks[0]
   for i in range(2): mutant+=(f'if {value} then' if i==index else needle)+chunks[i+1]
   p.write_text(mutant)
   name=f"{'banner' if index==0 else 'rim'}-guard-{value}"
   run=subprocess.run(['node','--test','--test-name-pattern=generated cards','tests/official-assets-runtime.test.mjs'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=90)
   Path('/tmp/pr588-review-nine/'+name+'.log').write_text(run.stdout)
   results.append({'name':name,'exit':run.returncode,'rejected':run.returncode!=0})
finally: p.write_text(original)
Path('/tmp/pr588-review-nine/mutations.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert all(r['rejected'] for r in results)
