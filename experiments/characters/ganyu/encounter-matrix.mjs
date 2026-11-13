import {readFileSync,writeFileSync} from 'node:fs';import {gzipSync} from 'node:zlib';
import {catalogue,play,endTurn} from './engine.mjs';import {createBattle,nextBattleTurn} from './battle.mjs';import {choose} from './accessibility.mjs';import {replayInputs} from './replay-inputs.mjs';
const file=new URL('./encounter-plan.json',import.meta.url);
const definitions={swarm:[{hp:40,block:0,intent:6},{hp:30,block:0,intent:4}],armored:[{hp:80,block:14,intent:8}],burst:[{hp:80,block:0,intent:4}]};
const cases={baseline:[],guard:['ganyu-09'],seek:['ganyu-10'],both:['ganyu-09','ganyu-10']};
const inputs=replayInputs('encounter-matrix.mjs');
if(process.argv.includes('--seal')){
 writeFileSync(file,JSON.stringify({candidate:'0.5',status:'prospective-plan-before-first-run',inputs,seeds:'2001..2025',sizes:[10,20,40],policies:['defend_bank','immediate'],definitions,cases,maxTurns:30,scope:'synthetic single encounters only, not production enemy/reward distribution'},null,2)+'\n');
 console.log('sealed explicit plan; no battles executed');process.exit(0);
}
const plan=JSON.parse(readFileSync(file));
if(JSON.stringify(plan.inputs)!==JSON.stringify(inputs))throw new Error('sealed inputs changed; do not silently relabel old validation');
const rows=[];
for(const size of plan.sizes)for(const scenario of Object.keys(definitions))for(const policy of plan.policies)for(const label of Object.keys(cases))for(let seed=2001;seed<=2025;seed++){
 const deck=catalogue.starting_deck.map(id=>({id}));while(deck.length<size)deck.push({id:deck.length%2?'ganyu-01':'ganyu-02'});deck.push(...cases[label].map(id=>({id})));
 let s=createBattle(definitions[scenario],seed,deck),firstCharged=null,seekMiss=0;
 while(s.phase==='player' && s.turn<=plan.maxTurns){
  if(scenario==='burst')s.enemies[0].intent=[4,18,6][(s.turn-1)%3];
  for(let actions=0;actions<10;actions++){
   const decision=choose({hand:s.hand,enemies:s.enemies,energy:s.energy,charge:s.charge,block:s.block,coreInDraw:s.draw.filter(c=>c.id==='ganyu-03').length},policy);
   if(!decision)break;
   const id=s.hand[decision.index].id;
   if(id==='ganyu-03'&&s.charge===2&&firstCharged===null)firstCharged=s.turn;
   s=play(s,decision.index,decision.target);
   if(id==='ganyu-10'&&!s.hand.some(c=>c.id==='ganyu-03'))seekMiss++;
   if(s.phase==='won')break;
  }
  if(s.phase==='player')s=endTurn(s);
  if(s.phase==='between')s=nextBattleTurn(s);
 }
 rows.push({size,actualSize:deck.length,scenario,policy,case:label,seed,firstCharged,seekMiss,outcome:s.phase==='player'?'truncated':s.phase,loss:60-s.hp,turn:s.turn});
}
const groups=[];
for(const size of plan.sizes)for(const scenario of Object.keys(definitions))for(const policy of plan.policies)for(const label of Object.keys(cases)){
 const rs=rows.filter(r=>r.size===size&&r.scenario===scenario&&r.policy===policy&&r.case===label);const losses=rs.map(r=>r.loss).sort((a,b)=>a-b);
 groups.push({size,scenario,policy,case:label,n:rs.length,wins:rs.filter(r=>r.outcome==='won').length,deaths:rs.filter(r=>r.outcome==='lost').length,truncated:rs.filter(r=>r.outcome==='truncated').length,neverCharged:rs.filter(r=>r.firstCharged===null).length,lossP50:losses[12],lossP90:losses[22]});
}
writeFileSync(new URL('./encounter-matrix-results.json.gz',import.meta.url),gzipSync(JSON.stringify({inputs,plan,samples:rows.length,groups,rows},null,2)+'\n'));
console.log(JSON.stringify(groups,null,2));
