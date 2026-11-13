/** Reproducible starter-only pressure study, not natural reward construction. */
import {battleStart,playInstance,nextTurn,visibleState} from './battle.mjs';
import {play} from './model.mjs';
import {pathToFileURL} from 'node:url';
const families={low:()=>[4],growing:turn=>[3+turn*2],large:()=>[18],multi:()=>[3,3,3]};
// Enumerate full legal sequences from ONLY visible state. No future hand/intent access.
export function choose(view,policy){
  const state={hp:view.hp,enemy:view.enemy,energy:view.energy,block:view.block,jade:view.jade,turn:view.turn,
    hand:view.hand.map(c=>c.instance),discard:[],instances:Object.fromEntries(view.hand.map(c=>[c.instance,{id:c.id,upgraded:c.upgraded}]))};
  const damage=s=>view.enemy.hp-s.enemy.hp;
  const loss=s=>s.enemy.hp===0?0:Math.min(s.hp,Math.max(0,view.intent.reduce((a,b)=>a+b,0)-s.block-s.jade));
  const score=s=>policy==='defense'?[-loss(s),damage(s),s.jade]:[s.enemy.hp===0?1:0,damage(s),-loss(s),s.jade];
  const better=(a,b)=>{for(let i=0;i<a.length;i++){if(a[i]!==b[i])return a[i]>b[i];}return false;};
  let best={score:score(state),path:[]};
  function walk(s,path){const value=score(s);if(better(value,best.score))best={score:value,path};
    for(const key of s.hand){const c=s.instances[key];const r=play(s,{id:c.id,instance:key,upgraded:c.upgraded,target:'enemy'});if(r.ok)walk(r.state,[...path,key]);}}
  walk(state,[]);return best.path;
}
export function trial(seed,family,policy,relic,withTrace=false,deck){const trace=[];let s=battleStart({seed,relic,deck});let deadPayoffDraws=0,unpayableAtStart=0,turns=0,firstPayoff=null;
  for(;turns<20&&s.hp&&s.enemy.hp;turns++){
    const hits=families[family](s.turn),view=visibleState(s,hits);
    for(const c of view.hand){if(c.id==='zl04'&&s.jade<6)deadPayoffDraws++;if(!playInstance(s,c.instance).ok)unpayableAtStart++;}
    const path=choose(view,policy);const record={turn:s.turn,hp:s.hp,enemyHp:s.enemy.hp,jade:s.jade,hand:view.hand.map(c=>c.id),intent:hits,chosen:path.map(key=>s.instances[key].id)};
    for(const key of path){const id=s.instances[key].id;const r=playInstance(s,key);if(!r.ok)throw new Error('policy emitted illegal action');s=r.state;if(id==='zl04'&&firstPayoff===null)firstPayoff=turns+1;}
    s=nextTurn(s,hits);if(withTrace)trace.push({...record,after:{hp:s.hp,enemyHp:s.enemy.hp,jade:s.jade}});
  }
  return {seed,outcome:s.enemy.hp===0?'win':s.hp===0?'death':'truncated',loss:60-s.hp,turns,deadPayoffDraws,unpayableAtStart,firstPayoff,...(withTrace?{trace}:{})};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
const groups=[];
for(const split of ['development','heldout'])for(const family of Object.keys(families))for(const policy of ['offense','defense'])for(const relic of [false,true]){
  const seeds=Array.from({length:10},(_,i)=>i+(split==='heldout'?1001:1));
  const rows=seeds.map(seed=>trial(seed,family,policy,relic)),losses=rows.map(r=>r.loss).sort((a,b)=>a-b);
  groups.push({split,family,policy,relic,n:rows.length,wins:rows.filter(r=>r.outcome==='win').length,deaths:rows.filter(r=>r.outcome==='death').length,truncated:rows.filter(r=>r.outcome==='truncated').length,lossP50:losses[4],lossP90:losses[8],rows});
}
console.log(JSON.stringify({version:'zhongli-starter-pressure-0.2',scope:'320 starter-only battles; no reward/shop/natural construction or fun evidence',turnLimit:20,policyInformation:'visible current hand/state/intent only; full legal turn enumeration; no future deck or future intent',seedPolicy:'1..10 development;1001..1010 heldout; no balance changes made from either set',statisticalLimit:'n=10 per cell, descriptive quantiles only; no reliable population win-rate inference',groups},null,2));

}
