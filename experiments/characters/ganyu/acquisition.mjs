// Isolated candidate reward lifecycle, not the production rarity/relic/reward implementation.
import {createHash} from 'node:crypto';
import {catalogue,initial,validateState,play,endTurn,rules} from './engine.mjs';
import {createBattle,nextBattleTurn} from './battle.mjs';import {validateDrawSeed,shufflePile} from './deck.mjs';
const clone=structuredClone;
const pool=catalogue.cards.filter(c=>c.rarity!=='basic').map(c=>c.id).sort();
export const poolDigest=createHash('sha256').update(JSON.stringify({catalogue,pool})).digest('hex');
const bag=cards=>JSON.stringify(cards.map(c=>`${c.id}:${c.upgraded===true}`).sort());
function validDeck(deck){if(!Array.isArray(deck)||!deck.length)throw new Error('invalid persistent deck');const s=initial();s.draw=clone(deck);validateState(s);}
export function validateRun(r){
 if(!r||r.mode!=='candidate-reward-research'||r.poolDigest!==poolDigest||!['battle','reward','complete','lost'].includes(r.phase))throw new Error('invalid run');
 validDeck(r.deck);validateDrawSeed(r.rewardSeed);validateDrawSeed(r.battleSeed);
 if(!Number.isSafeInteger(r.index)||r.index<0||!Array.isArray(r.encounters)||r.index>=r.encounters.length)throw new Error('invalid encounter index');
 if(!Number.isSafeInteger(r.hp)||r.hp<0||r.hp>rules.initialHp)throw new Error('invalid run hp');
 if(!Number.isSafeInteger(r.selectionSerial)||r.selectionSerial<0)throw new Error('invalid selection serial');
 if(!r.battle)throw new Error('missing battle');validateState(r.battle);
 if(r.hp!==r.battle.hp)throw new Error('hp drift');
 if(r.phase==='battle'&&r.battle.phase!=='player')throw new Error('invalid active battle');
 if(r.phase==='lost'&&r.battle.phase!=='lost')throw new Error('invalid lost battle');
 if(['reward','complete'].includes(r.phase)&&r.battle.phase!=='won')throw new Error('unearned reward');
 if(r.phase!=='reward'&&r.offer!==null)throw new Error('stale offer');
 const wonDeck=r.phase==='reward'&&r.offer?.claimed?r.deck.slice(0,-1):r.deck;
 if(bag(wonDeck)!==bag(['hand','draw','discard','exhausted'].flatMap(z=>r.battle[z])))throw new Error('card conservation');
 if(r.phase==='reward'){
  const o=r.offer;if(!o||o.id!==`battle-${r.index+1}-${poolDigest}`||typeof o.claimed!=='boolean'||typeof o.open!=='boolean'||!Array.isArray(o.cards)||o.cards.length!==3||new Set(o.cards).size!==3||o.cards.some(id=>!pool.includes(id)))throw new Error('invalid offer');
  if(o.claimed&&(o.open||!Number.isInteger(o.choice)||o.choice<0||o.choice>=3||o.cards[o.choice]!==r.deck.at(-1).id||r.deck.at(-1).upgraded===true))throw new Error('invalid claimed offer');
  if(!o.claimed&&o.choice!==null)throw new Error('unclaimed choice');
 }
}
export function createResearchRun(encounters,{rewardSeed=7919,battleSeed=37,deck=catalogue.starting_deck.map(id=>({id}))}={}){
 if(!Array.isArray(encounters)||!encounters.length)throw new Error('missing encounters');validDeck(deck);validateDrawSeed(rewardSeed);validateDrawSeed(battleSeed);
 const battle=createBattle(encounters[0],battleSeed,deck);
 const r={mode:'candidate-reward-research',phase:'battle',poolDigest,deck:clone(deck),hp:battle.hp,encounters:clone(encounters),index:0,battleSeed,rewardSeed,selectionSerial:0,offer:null,battle};validateRun(r);return r;
}
function settle(r){
 r.hp=r.battle.hp;
 if(r.battle.phase==='lost'){r.phase='lost';return;}
 if(r.battle.phase!=='won')return;
 if(r.index===r.encounters.length-1){r.phase='complete';return;}
 const rng={drawSeed:r.rewardSeed};const candidates=shufflePile(rng,[...pool]);r.rewardSeed=rng.drawSeed;
 r.offer={id:`battle-${r.index+1}-${poolDigest}`,cards:candidates.slice(0,3),claimed:false,open:false,choice:null};r.phase='reward';
}
export function act(r,command){
 validateRun(r);if(r.phase!=='battle')throw new Error('not battling');const s=clone(r);
 if(command.type==='play')s.battle=play(s.battle,command.index,command.target??null,command.cancel??false);
 else if(command.type==='end'){s.battle=endTurn(s.battle);if(s.battle.phase==='between')s.battle=nextBattleTurn(s.battle);}
 else throw new Error('unknown action');
 settle(s);validateRun(s);return s;
}
export function openReward(r){validateRun(r);if(r.phase!=='reward'||r.offer.claimed)throw new Error('no pending reward');const s=clone(r);s.selectionSerial++;s.offer.open=true;validateRun(s);return s;}
export function selectionToken(r){return `${r.offer?.id}:${r.selectionSerial}`;}
function selected(r,token){validateRun(r);if(r.phase!=='reward'||!r.offer.open||r.offer.claimed||token!==selectionToken(r))throw new Error('stale selection');}
export function skipReward(r,token){selected(r,token);const s=clone(r);s.offer.open=false;validateRun(s);return s;}
export function claimReward(r,token,choice){
 selected(r,token);if(!Number.isInteger(choice)||choice<0||choice>=r.offer.cards.length)throw new Error('invalid choice');
 const s=clone(r);s.deck.push({id:s.offer.cards[choice],upgraded:false});s.offer.claimed=true;s.offer.choice=choice;s.offer.open=false;validateRun(s);return s;
}
export function proceed(r){
 validateRun(r);if(r.phase!=='reward')throw new Error('not proceeding');const s=clone(r),index=s.index+1;
 // Create/validate destination first. A failure cannot expire the caller's pending reward.
 const seed=((s.battleSeed-1+index)%0xffffffff)+1;
 const battle=createBattle(s.encounters[index],seed,s.deck);battle.hp=s.hp;validateState(battle);
 s.battle=battle;s.index=index;s.phase='battle';s.offer=null;validateRun(s);return s;
}
