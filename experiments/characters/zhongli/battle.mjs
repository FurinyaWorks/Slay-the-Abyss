/** Deck/turn harness for the isolated candidate. No production integration. */
import {initialState, play, endTurn, cards, textFor, JADE_CAP} from './model.mjs';
export const STARTER = ['zl01','zl01','zl01','zl01','zl02','zl02','zl02','zl02','zl03','zl04'];
export const RELIC = Object.freeze({id:'zl-relic01',name:'待命名·zl-relic01',status:'HOLD',effect:Object.freeze({event:'battleStart',jade:3}),get description(){return `每场战斗开始时获得${this.effect.jade}点玉璋。每场仅触发一次。`;}});
function random(s) { s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0; return s.rng/4294967296; }
function shuffle(s, xs) { const out=[...xs]; for(let i=out.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out; }
/** Validate the whole battle boundary, including zones absent from the math kernel. */
export function validateBattle(s) {
  if(!s || !s.enemy || !s.instances || typeof s.instances!=='object')throw new Error('invalid battle');
  for(const n of [s.hp,s.energy,s.block,s.jade,s.enemy.hp,s.enemy.block,s.enemy.weak ?? 0,s.turn,s.rng,s.pendingDraw ?? 0])
    if(!Number.isSafeInteger(n)||n<0)throw new Error('invalid battle');
  if((s.pendingDraw ?? 0)>10||Boolean(s.inUse)!==Boolean(s.pendingDraw))throw new Error('invalid battle');
  if(s.hp>60||s.jade>JADE_CAP||s.turn<1||s.rng>0xffffffff||typeof s.relicApplied!=='boolean')throw new Error('invalid battle');
  if(![s.hand,s.draw,s.discard,s.exhaust].every(Array.isArray)||s.hand.length>10)throw new Error('invalid battle');
  const zones=[...s.hand,...s.draw,...s.discard,...s.exhaust,...(s.inUse?[s.inUse]:[])], keys=Object.keys(s.instances);
  if(new Set(zones).size!==zones.length||zones.length!==keys.length)throw new Error('invalid battle');
  for(const key of zones){
    const c=s.instances[key];
    if(typeof key!=='string'||!Object.hasOwn(s.instances,key)||!c||!cards.some(x=>x.id===c.id)||typeof c.upgraded!=='boolean')throw new Error('invalid battle');
  }
}
export function draw(state,count=5){
  validateBattle(state);
  if(!Number.isInteger(count)||count<0||count>10)throw new Error('invalid draw count');
  if(!state.hp||!state.enemy.hp)return state;
  const s=structuredClone(state);
  for(let i=0;i<count && s.hand.length<10;i++){
    if(!s.draw.length){s.draw=shuffle(s,s.discard);s.discard=[];}
    if(!s.draw.length)break;
    s.hand.push(s.draw.pop());
  }
  return s;
}
export function battleStart({seed=1,deck=STARTER,hp=60,enemyHp=40,relic=true}={}){
  if(!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(hp)||hp<1||hp>60||!Number.isInteger(enemyHp)||enemyHp<1||typeof relic!=='boolean')throw new Error('invalid setup');
  if(!Array.isArray(deck)||!deck.length||deck.length>100||deck.some(id=>!cards.some(c=>c.id===id)))throw new Error('invalid deck');
  let s=initialState([]);s.hp=hp;s.enemy.hp=enemyHp;s.rng=seed;s.draw=[];s.instances={};s.relicApplied=false;
  deck.forEach((id,i)=>{const key=`card-${i}`;s.instances[key]={id,upgraded:false};s.draw.push(key);});
  s.draw=shuffle(s,s.draw);s=applyRelic(s,relic);return draw(s);
}
export function applyRelic(state,enabled=true){
  validateBattle(state);
  if(typeof enabled!=='boolean')throw new Error('invalid relic option');
  if(!state.hp||!state.enemy.hp)return state;
  if(state.relicApplied)return structuredClone(state);
  const s=structuredClone(state);s.relicApplied=true;if(enabled)s.jade=Math.min(JADE_CAP,s.jade+RELIC.effect.jade);return s;
}
export function playInstance(state,instance){
  validateBattle(state);
  const c=state.instances[instance];if(!c)return {ok:false,reason:'missing instance',state};
  const r=play(state,{instance,id:c.id,upgraded:c.upgraded,target:'enemy'});
  if(!r.ok||!r.state.pendingDraw)return r;
  const next=draw(r.state,r.state.pendingDraw);
  next.pendingDraw=0;next.inUse=null;
  (cards.find(x=>x.id===c.id).exhaust?next.exhaust:next.discard).push(instance);
  validateBattle(next);return {ok:true,state:next};
}
export function nextTurn(state,hits){
  validateBattle(state);
  const s=endTurn(state,hits);if(!s.hp||!s.enemy.hp)return s;return draw(s);
}
export function visibleState(s,intent){validateBattle(s);if(s.pendingDraw)throw new Error('unresolved draw');if(!Array.isArray(intent)||intent.some(n=>!Number.isSafeInteger(n)||n<0))throw new Error('invalid intent');return {hp:s.hp,enemy:{...s.enemy},energy:s.energy,block:s.block,jade:s.jade,turn:s.turn,intent:[...intent],hand:s.hand.map(instance=>({instance,...s.instances[instance],text:textFor(s.instances[instance].id,s.instances[instance].upgraded)}))};}
