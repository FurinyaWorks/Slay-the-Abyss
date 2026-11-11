// Reuse #621's explicit ten/five-card setup, retaining every other actual Lua byte.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const [directory,reference]=process.argv.slice(2),hash=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p)),actualPath=path.join(directory,'pr588.actual.save.json'),actual=read(actualPath);
const adapter=read(path.join(directory,'adapter-receipt.json'));
assert.deepEqual(adapter.inverseReadback.faults,[]);
assert.equal(Object.keys(adapter.unknownProperties).length,0);
for(const name of reference?['hud','five']:['hud']){
 let removed,added;
 if(reference){
  const original=read(path.join(reference,'pr588.actual.save.json')).assets.scripts.find(s=>s.path==='abyss_game_ui.lua').source;
  const before=read(path.join(reference,name+'.save.json')).assets.scripts.find(s=>s.path==='abyss_game_ui.lua').source;
  let prefix=0;while(original[prefix]===before[prefix])prefix++;
  let suffix=0;while(original.at(-suffix-1)===before.at(-suffix-1))suffix++;
  removed=original.slice(prefix,original.length-suffix);added=before.slice(prefix,before.length-suffix);
 }else{
  added=fs.readFileSync('experiments/lumine-idle/battle-fixture.lua','utf8');
  assert.equal(hash(added),'0c7d3724c9f92b967429c563ff360d6906db88efd317c27e09f0ed3282aca683');
  const source=actual.assets.scripts.find(s=>s.path==='abyss_game_ui.lua').source;
  removed=source.match(/return M\s*$/)?.[0];assert(removed,'final module return missing');
 }
 const save=structuredClone(actual),module=save.assets.scripts.find(s=>s.path==='abyss_game_ui.lua');
 assert.equal(module.source.split(removed).length,2,'fixture patch must match exactly once');
 const originalModuleSha256=hash(module.source);module.source=module.source.replace(removed,added);
 save.meta.name='Lumine comparison '+name;
 const file=path.join(directory,name+'.save.json');fs.writeFileSync(file,JSON.stringify(save));
 fs.writeFileSync(file+'.receipt.json',JSON.stringify({kind:'offline-sdk-pressure-fixture',input:path.resolve(actualPath),inputSha256:hash(fs.readFileSync(actualPath)),
  modifiedModule:'abyss_game_ui.lua',originalModuleSha256,fixtureModuleSha256:hash(module.source),gameRulesChanged:false,officialImport:false},null,2));
}
console.log(directory+' fixtures ready; active native properties round-trip exactly');
