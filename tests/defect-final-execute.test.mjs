import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import luaparse from 'luaparse';
const path='src/lua/abyss_defect_final_cards.lua';
const read=p=>readFileSync(p,'utf8').replaceAll('\r\n','\n');
const before=read('tests/fixtures/defect-final-execute-before.lua');
const current=()=>read(path);
function run(source,fixture){
 const dir=mkdtempSync(join(tmpdir(),'defect-execute-'));
 try{
  const output=join(dir,'graphs.jsonl');
  const child=spawnSync(process.execPath,['tests/helpers/defect-final-execute-vm.mjs'],{
   input:JSON.stringify({source,fixture,output}),encoding:'utf8',timeout:120000,maxBuffer:8*1024**2});
  assert.ifError(child.error);assert.equal(child.signal,null,'timeout is not a semantic mutant kill');assert.equal(child.status,0,child.stderr);
  return {...JSON.parse(child.stdout),graph:readFileSync(output,'utf8')};
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('complete Defect source is immutable 6f017ff875baa2de80a121e507634a2d859fecfa Git blob',()=>{
 assert.equal(createHash('sha256').update(before).digest('hex'),'df100051b93665ecc88dea658f9c3bfdf24148907fd740c50ca0166852f9be71');
 assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),'16821c6065a7819bae767e1f6f511c497eba903a');
});
for(const fixture of ['tests/helpers/defect-final-execute-edges.lua',...[
 'defect_final_actions','defect_final_generation','defect_final_defenses','defect_final_powers','defect_final_matrix','defect_final_end_cleanup','defect_genetic_copies',
].map(n=>'tests/lua/'+n+'.lua')])test(`${fixture}: independent VMs compare complete graphs, aliases, returns, RNG, queues and errors`,()=>{
 const a=run(before,fixture),b=run(current(),fixture);
 assert.equal(a.status,0,a.error);assert.equal(b.status,0,b.error);
 console.log('DEFECT_EXECUTE_GRAPH_RESULT '+JSON.stringify({fixture,checkpoints:b.checkpoints,bytes:Buffer.byteLength(b.graph)}));
 assert(b.checkpoints>0);if(fixture.startsWith('tests/lua/'))assert(b.labels.some(l=>l.startsWith('execute:')),'retained fixture must execute DefectFinal.execute');assert.deepEqual(b.logs,a.logs);assert.deepEqual(b.labels,a.labels);assert.equal(b.graph,a.graph);
});
for(const [name,from,to]of [
 ['double created hooks','actions.created(combat,state,card);actions.created(combat,state,card)','actions.created(combat,state,card)'],
 ['white noise cost',"if action=='white_noise'then card.costForTurn=0 end","if action=='white_noise'then card.costForTurn=1 end"],
 ['rebound first application',"effect.status=='rebound'and old==nil","effect.status=='rebound'and old~=nil"],
 ['recursion queue identity',"ball=first","ball=Copy.copy(first)"],
 ['scrape queue ordering','for i=#discard,1,-1 do','for i=1,#discard do'],
 ['first discard match','state.hand[#state.hand+1]=c;break','state.hand[#state.hand+1]=c'],
 ['fission slot count','for _=1,state.orbs.slots do','for _=1,#state.orbs.balls do'],
 ['fission removes balls','state.orbs.balls[i]=nil','state.orbs.balls[i]=state.orbs.balls[i]'],
 ['reboot shuffle streams','Random.shuffle(state.shuffleRng,state.discard)','Random.shuffle(state.cardRandomRng,state.discard)'],
 ['recycle return tuple',"then return require('abyss_hand_choice').begin(state,'recycle',1,queue)","then require('abyss_hand_choice').begin(state,'recycle',1,queue)"],
])test(`semantic mutant ${name} fails a named behavior assertion, never timeout`,()=>{
 const source=current();assert(source.includes(from),from);const mutation=source.replaceAll(from,to);luaparse.parse(mutation,{luaVersion:'5.3'});
 const result=run(mutation,'tests/helpers/defect-final-execute-edges.lua');
 console.log('DEFECT_EXECUTE_MUTANT_RESULT '+JSON.stringify({name,status:result.status,error:result.error}));
 assert.equal(result.status,2,result.error);
 assert.match(result.error,new RegExp('tests/helpers/defect-final-execute-edges.lua:\\d+: '+name+'$'));
});
