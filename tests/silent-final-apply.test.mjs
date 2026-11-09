import {silentPotionEpoch} from './helpers/silent-potion-source-epoch.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import luaparse from 'luaparse';
const path='src/lua/abyss_silent_final_cards.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=read('tests/fixtures/silent-final-apply-before.lua');
const current=()=>read(path);
function run(source,fixture){
 const dir=mkdtempSync(join(tmpdir(),'silent-apply-'));
 try{
  const output=join(dir,'graphs.jsonl');
  const child=spawnSync(process.execPath,['tests/helpers/silent-final-apply-vm.mjs'],{
   input:JSON.stringify({source,fixture,output,oldPotionSource:source===before?silentPotionEpoch.proof.targets.prior.files['src/lua/abyss_silent_potions.lua'].source:null}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
  assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
  const result=JSON.parse(child.stdout);return {...result,graph:readFileSync(output,'utf8')};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('full Silent source is the immutable d2ed1bbf Git blob, with no reconstructed baseline',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'a8648acd0e294f142be20bc4e1561ceded10c1455ec8b493cc96c7e1f6d36fef');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'0a5a658f29176a27707d370b8a24fc24b6e73161');
});
for(const fixture of ['tests/helpers/silent-final-apply-edges.lua',...[
 'silent_final_runtime','silent_final_edges','silent_final_potions','silent_burst_retrieval','silent_corpse_artifact',
].map(n=>'tests/lua/'+n+'.lua')])test(`${fixture}: independent old/new VMs compare every complete graph, alias, return, RNG and event`,()=>{
 const a=run(before,fixture),b=run(current(),fixture);
 assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);
 console.log('SILENT_GRAPH_RESULT '+JSON.stringify({fixture,checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph)}));
 assert(a.checkpoints>0);assert.deepEqual(b.logs,a.logs);assert.deepEqual(b.labels,a.labels);assert.equal(b.graph,a.graph);
 if(fixture.includes('apply-edges')){
  const kinds=[...new Set(b.labels.filter(l=>l.startsWith('apply:')).map(l=>l.slice(6)))].sort();
  assert.deepEqual(kinds,['gainSilentFinalPower','potionShivs','trigger','choke','setup','nightmare','bulletTime','copyHand','distraction','doppelganger','phantasmalGain','remove','tools','startPower','corpseDamage','alchemize','unsupported','nil','false','7','NaN','table-kind','function-kind'].sort());
 }
});
for(const [name,from,to]of [
 ['double created hooks','actions().created(combat,s,c);actions().created(combat,s,c)','actions().created(combat,s,c)'],
 ['Doppelganger X bonus',"then n=n+2 end","then n=n+1 end"],
 ['Bullet Time costs','combat.cardDefinition(s,c).cost>=0','combat.cardDefinition(s,c).cost>=-1'],
 ['corpse damage amount','enemy,e.value,true,reactions','enemy,0,true,reactions'],
 ['repeated lazy requires','actions().created(combat,s,c);actions().created(combat,s,c)','local cached=actions();cached.created(combat,s,c);cached.created(combat,s,c)'],
 ['trigger top queue',"action=entry.effect},nil,nil,nil,true)","action=entry.effect},nil,nil,nil,false)"],
 ['first choke target',"hpLost(s,enemy,before,true);break","hpLost(s,enemy,before,true)"],
 ['dynamic public recursion',"M.apply(combat,s,{effect={kind='phantasmalGain',value=e.value}})","actionHandlers.phantasmalGain(combat,s,{value=e.value})"],
 ['Nightmare cleanup',"s.nightmareTemplate=nil;s.player.nightmareCardName=nil","s.player.nightmareCardName=nil"],
])test(`parsed semantic mutant: ${name} is rejected by a behavior assertion, never timeout`,()=>{
 const source=current();assert(source.includes(from),from);const mutation=source.replaceAll(from,to);luaparse.parse(mutation,{luaVersion:'5.3'});
 const result=run(mutation,'tests/helpers/silent-final-apply-edges.lua');
 console.log('SILENT_MUTANT_RESULT '+JSON.stringify({name,status:result.status,error:result.error}));
 assert.equal(result.status,2,result.error);
 assert.match(result.error,new RegExp('tests/helpers/silent-final-apply-edges.lua:\\d+: '+name+'$'));
});
