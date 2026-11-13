import {realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {snapshot as identity} from './audit.mjs';
const used=new Set();
const pick=(s,keys)=>Object.fromEntries(keys.filter(k=>s[k]!==undefined).map(k=>[k,s[k]]));
const zones=s=>({draw:s.draw.length,discard:s.discard.length,exhaust:(s.exhaust??s.exhausted??[]).length,powers:(s.powers??[]).length});
const row=(id,text,role)=>({id,name:'待命名·'+id,base:text(false),upgraded:text(true),role,source:'HOLD',naming:'HOLD',balance:'HOLD'});
const accept=r=>{if(!r.ok)throw Error(r.reason||'model rejected');return r.state;};
export async function loadAdapter(root,character,expectedHead){
 if(!['ganyu','xiao','zhongli','keqing'].includes(character)||!/^[a-f0-9]{40}$/.test(expectedHead))throw Error('character and exact expected HEAD required');
 root=realpathSync(resolve(root));const dir=join(root,'experiments','characters',character);
 const before=identity(root,dir);
 if(before.head!==expectedHead||before.dirty)throw Error('wrong HEAD or dirty checkout; use a separate clean pinned worktree');
 if(used.has(dir))throw Error('restart process before importing same model again');used.add(dir);
 const mod=f=>import(pathToFileURL(join(dir,f)).href);
 let a;
 if(character==='ganyu'){
  const m=await mod('engine.mjs'),b=await mod('battle.mjs');
  const outcome=s=>s.phase==='won'?'victory':s.phase==='lost'?'defeat':'playing';
  a={catalog:m.catalogue.cards.map(c=>row(c.id,u=>m.cardText(c.id,u),c.role)),
   start:(seed,mode)=>b.createBattle([{hp:35,block:0,intent:6},{hp:22,block:0,intent:4}],seed,mode==='all'?m.catalogue.cards.map(c=>({id:c.id})):undefined),
   play:(s,i,t)=>m.play(s,i,t??null),end:s=>{const n=m.endTurn(s);return n.phase==='between'?b.nextBattleTurn(n):n;},outcome,
   view:s=>({...pick(s,['hp','energy','block','turn','charge','storm']),outcome:outcome(s),zones:zones(s),
    relic:{text:m.relicText(),equipped:s.relics.includes(m.starterRelic.id)},
    enemies:s.enemies.map((e,i)=>({target:i+1,hp:e.hp,block:e.block,intent:e.hp?e.intent:0})),
    hand:s.hand.map((c,i)=>({slot:i+1,id:c.id,text:m.cardText(c.id,c.upgraded===true)}))})};
 }else if(character==='xiao'){
  const m=await mod('model.mjs'),b=await mod('battle.mjs');const outcome=s=>b.outcome(s);
  a={catalog:m.catalog.cards.map(c=>row(c.id,u=>m.cardText(c,u),c.role)),
   start:(seed,mode)=>b.newBattle({seed,deck:mode==='all'?m.catalog.cards.map(c=>c.id):m.catalog.starter}),
   play:(s,index,target)=>accept(b.battlePlay(s,{index,target:target??0,upgraded:false})),end:b.advance,outcome,
   view:s=>({...pick(s,['hp','energy','block','turn','mask','maskGuard','exitGuard']),outcome:outcome(s),zones:zones(s),
    relic:{...m.catalog.startingRelic,equipped:s.startingRelic,used:s.relicUsed},
    enemies:s.enemies.map((e,i)=>({target:i+1,hp:e.hp,block:e.block,intent:e.hp?b.intent(s,e):0})),
    hand:s.hand.map((id,i)=>({slot:i+1,id,text:m.cardText(m.catalog.cards.find(c=>c.id===id),false)}))})};
 }else if(character==='zhongli'){
  const m=await mod('model.mjs'),b=await mod('battle.mjs');const hits=s=>[s.turn%3===0?14:8];
  const outcome=s=>!s.hp?'defeat':!s.enemy.hp?'victory':'playing';
  a={catalog:m.cards.map(c=>row(c.id,u=>m.textFor(c.id,u),c.role)),
   start:(seed,mode)=>b.battleStart({seed,deck:mode==='all'?m.cards.map(c=>c.id):b.STARTER}),
   play:(s,i)=>accept(b.playInstance(s,s.hand[i])),end:s=>b.nextTurn(s,hits(s)),outcome,
   view:s=>({...pick(s,['hp','energy','block','turn','jade']),outcome:outcome(s),zones:zones(s),
    relic:{id:b.RELIC.id,text:b.RELIC.description,initialized:s.relicApplied},
    enemies:[{target:1,...s.enemy,rawIntent:s.enemy.hp?hits(s):[],intent:s.enemy.hp?hits(s).map(n=>m.incomingAttack(n,s.enemy.weak??0)):[]}],
    hand:b.visibleState(s,hits(s)).hand.map((c,i)=>({slot:i+1,id:c.id,text:c.text}))})};
 }else{
  const m=await mod('mechanics.mjs'),b=await mod('battle.mjs');
  const outcome=s=>s.phase==='won'?'victory':s.phase==='lost'?'defeat':'playing';
  a={catalog:Object.entries(m.cards).map(([id,c])=>row(id,u=>m.describe(id,u),c.role)),
   start:(seed,mode)=>b.createBattle({seed,deckIds:mode==='all'?Object.keys(m.cards):b.starterIds}),
   play:(s,i,t)=>b.useCard(s,s.hand[i].instance,t??0),end:b.finishTurn,outcome,
   view:s=>({...pick(s,['hp','energy','block','turn','wedgeUntil','infusion']),outcome:outcome(s),zones:zones(s),
    relic:{id:b.starterRelic.id,text:b.describeRelic(),equipped:s.relicEnabled,used:s.relicUsed},
    enemies:s.enemies.map((e,i)=>({target:i+1,hp:e.hp,block:e.block,intent:e.hp?e.intent:0})),
    hand:s.hand.map((c,i)=>({slot:i+1,id:c.id,text:m.describe(c.id,c.upgraded===true)}))})};
 }
 const assertCurrent=()=>{if(JSON.stringify(before)!==JSON.stringify(identity(root,dir)))throw Error('model snapshot changed; quit and reopen a clean pinned version');};
 assertCurrent();return {...a,assertCurrent,identity:{character,root,...before}};
}
