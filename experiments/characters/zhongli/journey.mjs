/** Three-room synthetic acquisition experiment. NOT the production rarity generator. */
import {STARTER,battleStart,validateBattle,playInstance,nextTurn,visibleState} from './battle.mjs';
import {visibleTurn} from './pressure.mjs';
export const POOLS=Object.freeze({v1:Object.freeze(['zl03','zl04','zl06','zl07','zl08']),v2:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12']),v3:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13']),v4:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14']),v5:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15']),v6:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16']),v7:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17']),v8:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18']),v9:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19']),v10:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20']),v11:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21']),v12:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22']),v13:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23']),v14:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23','zl24']),v15:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23','zl24','zl25']),v16:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23','zl24','zl25','zl26']),v17:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23','zl24','zl25','zl26','zl27']),v18:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23','zl24','zl25','zl26','zl27','zl28']),v19:Object.freeze(['zl03','zl04','zl06','zl07','zl08','zl09','zl11','zl12','zl13','zl14','zl15','zl16','zl17','zl18','zl19','zl20','zl21','zl22','zl23','zl24','zl25','zl26','zl27','zl28','zl29'])});
export function offers(seed,room,poolVersion='v1'){
  if(!Object.hasOwn(POOLS,poolVersion))throw new Error('invalid pool version');
  if(!Number.isSafeInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(room)||room<1||room>3)throw new Error('invalid offer setup');
  let rng=(seed ^ Math.imul(room,2654435761))>>>0;
  const pool=[...POOLS[poolVersion]];
  for(let i=pool.length-1;i>0;i--){rng=(Math.imul(rng,1664525)+1013904223)>>>0;const j=Math.floor(rng/4294967296*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,3);
}
export function journeyStart(seed=1,{poolVersion='v1'}={}){
  if(!Object.hasOwn(POOLS,poolVersion))throw new Error('invalid pool version');
  const battle=battleStart({seed});
  return {seed,poolVersion,room:1,deck:[...STARTER],battle,phase:'battle',offer:[],history:[]};
}
function validate(s){
  if(!s||!Number.isInteger(s.seed)||s.seed<0||s.seed>0xffffffff||!Number.isInteger(s.room)||s.room<1||s.room>3||
    !['battle','reward','complete','death','truncated'].includes(s.phase)||!Array.isArray(s.deck)||!Array.isArray(s.offer)||!Array.isArray(s.history))throw new Error('invalid journey');
  if(!Object.hasOwn(POOLS,s.poolVersion ?? 'v1'))throw new Error('invalid pool version');
  validateBattle(s.battle);
  if(s.phase==='reward'&&s.room>=3)throw new Error('invalid terminal reward');
  if(s.phase==='complete'&&(s.room!==3||s.battle.enemy.hp!==0||s.battle.hp===0))throw new Error('invalid completion');
  if(s.phase==='death'&&s.battle.hp!==0)throw new Error('invalid death');
  if(s.phase==='truncated'&&(!s.battle.hp||!s.battle.enemy.hp))throw new Error('invalid truncation');
  const ids=Object.values(s.battle.instances).map(c=>c.id).sort();
  if(JSON.stringify(ids)!==JSON.stringify([...s.deck].sort()))throw new Error('invalid journey deck');
  if(s.phase==='reward'&&(s.battle.enemy.hp!==0||s.battle.hp===0||JSON.stringify(s.offer)!==JSON.stringify(offers(s.seed,s.room,s.poolVersion ?? 'v1'))))throw new Error('invalid reward');
}
export function fightRoom(state,policy='defense',family='multi'){
  validate(state);if(state.phase!=='battle')throw new Error('not battle');
  if(!['offense','defense'].includes(policy)||!['low','multi','growing','large'].includes(family))throw new Error('invalid policy');
  const s=structuredClone(state),startHp=s.battle.hp;let deadPayoffDraws=0,turns=0;
  for(;turns<20&&s.battle.hp&&s.battle.enemy.hp;turns++){
    const hits=family==='low'?[4]:family==='multi'?[3,3,3]:family==='large'?[18]:[3+2*s.battle.turn];
    const view=visibleState(s.battle,hits);
    deadPayoffDraws+=view.hand.filter(c=>c.id==='zl04'&&view.jade<6).length;
    s.battle=visibleTurn(s.battle,hits,policy).state;
    s.battle=nextTurn(s.battle,hits);
  }
  s.phase=!s.battle.hp?'death':s.battle.enemy.hp?'truncated':s.room===3?'complete':'reward';
  s.offer=s.phase==='reward'?offers(s.seed,s.room,s.poolVersion ?? 'v1'):[];
  s.history.push({room:s.room,family,turns,startHp,endHp:s.battle.hp,loss:startHp-s.battle.hp,deckSize:s.deck.length,deadPayoffDraws,outcome:s.phase,offer:[...s.offer]});
  validate(s);return s;
}
/** 0 = explicit abandonment, not production modal close. Resolves once, starts next room. */
export function takeReward(state,choice){
  validate(state);
  if(state.phase!=='reward'||!Number.isInteger(choice)||choice<0||choice>state.offer.length)throw new Error('invalid reward choice');
  const s=structuredClone(state);
  if(choice)s.deck.push(s.offer[choice-1]);
  s.history.at(-1).choice=choice?s.offer[choice-1]:'abandon';
  s.room++;s.phase='battle';s.offer=[];
  s.battle=battleStart({seed:(s.seed+s.room*65537)>>>0,deck:s.deck,hp:s.battle.hp});
  validate(s);return s;
}
export function rewardView(s){validate(s);return {hp:s.battle.hp,deck:[...s.deck],offer:[...s.offer]};}
export function selectReward(view,policy){
  if(policy==='skip')return 0;
  // Known deck composition only, no future enemies, offers, draws or outcomes.
  const preferred=policy==='guardedExpose'?'zl29':policy==='suppressReserve'?'zl28':policy==='collapse'?(view.deck.includes('zl21')?'zl27':'zl21'):policy==='heldReserve'?'zl26':policy==='pillarGuard'?(view.deck.includes('zl21')?'zl25':'zl21'):policy==='reserveSearch'?'zl24':policy==='dismantle'?(view.deck.includes('zl21')?'zl23':'zl21'):policy==='resonance'?(view.deck.includes('zl21')?'zl22':'zl21'):policy==='hybrid'?'zl07':policy==='reserve'?'zl08':policy==='suppress'?'zl09':policy==='guarded'?'zl11':policy==='access'?'zl12':policy==='expose'?'zl13':policy==='wait'?'zl14':policy==='counter'?'zl15':policy==='convert'?'zl16':policy==='breach'?'zl17':policy==='reservePayoff'?'zl18':policy==='reserveAccess'?'zl19':policy==='rebuild'?'zl20':policy==='pillar'?'zl21':policy==='pulse'?'zl22':null;
  if(!preferred)throw new Error('invalid reward policy');
  return view.deck.filter(id=>id===preferred).length>=1?0:view.offer.indexOf(preferred)+1;
}
