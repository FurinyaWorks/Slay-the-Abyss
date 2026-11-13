// Bounded reward experiment, not the game's natural map/shop/reward distribution.
import { catalog } from './model.mjs';
import { shuffle } from './deck.mjs';
import { newBattle, battlePlay, advance, outcome, validBattleState } from './battle.mjs';
const route = ['duel','swarm','armor'];
const uint32 = n => Number.isInteger(n) && n >= 0 && n <= 0xffffffff;
function valid(c) {
  if (!c || !uint32(c.seed) || !uint32(c.rewardRng) || !Number.isInteger(c.stage) || c.stage < 0 || c.stage >= route.length) return false;
  if (!['battle','reward','victory','defeat'].includes(c.phase) || !validBattleState(c.battle)) return false;
  if (!Array.isArray(c.deck) || !c.deck.length || c.deck.length > 100 || c.deck.some(id=>!catalog.cards.some(card=>card.id===id))) return false;
  if (!Array.isArray(c.choices) || c.choices.length !== c.stage || c.choices.some((h,i)=>!h || h.stage!==i || !Array.isArray(h.offer) || h.offer.length!==3 || new Set(h.offer).size!==3 || h.offer.some(id=>!catalog.rewardCandidates.includes(id)) || (h.selected!==null&&!h.offer.includes(h.selected)))) return false;
  if (JSON.stringify(c.deck)!==JSON.stringify([...catalog.starter,...c.choices.filter(h=>h.selected!==null).map(h=>h.selected)])) return false;
  if (!Array.isArray(c.offer) || new Set(c.offer).size !== c.offer.length || c.offer.some(id=>!catalog.rewardCandidates.includes(id))) return false;
  if (c.phase === 'reward') return c.stage < route.length - 1 && c.offer.length === 3 && outcome(c.battle) === 'victory';
  if(c.offer.length!==0)return false;
  if(c.phase==='victory')return c.stage===route.length-1&&outcome(c.battle)==='victory';
  if(c.phase==='defeat')return outcome(c.battle)==='defeat';
  return outcome(c.battle)==='playing';
}
function settle(c) {
  const result = outcome(c.battle);
  if (result === 'playing') return;
  if (result === 'defeat') { c.phase='defeat'; return; }
  if (c.stage === route.length - 1) { c.phase='victory'; return; }
  const rng={rng:c.rewardRng};
  c.offer=shuffle(rng,catalog.rewardCandidates).slice(0,3); c.rewardRng=rng.rng; c.phase='reward';
}
export function newCampaign(seed=1) {
  if(!uint32(seed))throw Error('invalid seed');
  return {seed,rewardRng:(seed^0x9E3779B9)>>>0,stage:0,phase:'battle',deck:[...catalog.starter],offer:[],battle:newBattle({seed}),choices:[]};
}
export function campaignAction(input, action) {
  const reject=reason=>({ok:false,reason,state:structuredClone(input)});
  if(!valid(input))return reject('state');
  const c=structuredClone(input);
  if(action?.type==='reward'){
    if(c.phase!=='reward')return reject('phase');
    if(action.card!==null&&!c.offer.includes(action.card))return reject('not-offered');
    c.choices.push({stage:c.stage,offer:[...c.offer],selected:action.card});
    if(action.card!==null)c.deck.push(action.card);
    c.stage++;c.offer=[];c.phase='battle';
    c.battle=newBattle({seed:(c.seed+c.stage*100003)>>>0,encounter:route[c.stage],hp:input.battle.hp,deck:c.deck});
  }else{
    if(c.phase!=='battle')return reject('phase');
    if(action?.type==='play'){
      const r=battlePlay(c.battle,action);if(!r.ok)return reject(r.reason);c.battle=r.state;
    }else if(action?.type==='end')c.battle=advance(c.battle);
    else return reject('action');
    settle(c);
  }
  return {ok:true,state:c};
}
