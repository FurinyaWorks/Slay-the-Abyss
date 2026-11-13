import { cards, cardDefinitions, initial, play, playSteps, endTurn, nextTurn } from './mechanics.mjs';

export const starterRelic = Object.freeze({
  id: 'KQR001', name: '待命名·KQR001', status: 'HOLD',
  effect: Object.freeze({ trigger: 'first_wedge_setup_per_combat', op: 'block', amount: 4 }),
});
export function describeRelic() {
  return `${starterRelic.name}：每场战斗首次设置雷楔后，获得${starterRelic.effect.amount}格挡。`;
}
export const starterIds = Object.freeze(['KQ001','KQ001','KQ001','KQ002','KQ002','KQ002','KQ002','KQ003','KQ003','KQ004']);
function shuffle(cards, seed) {
  const result = [...cards];
  let rng = seed >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
    const j = rng % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return { cards: result, seed: rng };
}
function draw(state, count) {
  const drawn=[];
  if(state.drawLocked)return drawn;
  for (let i = 0; i < count && state.hand.length < 10; i++) {
    if (!state.draw.length && state.discard.length) {
      const shuffled = shuffle(state.discard, state.rng);
      state.draw = shuffled.cards;
      state.rng = shuffled.seed;
      state.discard = [];
    }
    if (!state.draw.length) break;
    const card=state.draw.shift();state.hand.push(card);drawn.push(card);
  }
  return drawn;
}
export function createBattle({ seed = 1, enemies = [{ hp: 50, block: 0, intent: 8 }], relic = true, order = null, deckIds = starterIds } = {}) {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('invalid seed');
  if (typeof relic !== 'boolean') throw new Error('invalid relic flag');
  if (!Array.isArray(enemies) || !enemies.some(e => e.hp > 0)) throw new Error('no live enemies');
  if (enemies.some(e => !Number.isInteger(e.intent) || e.intent < 0)) throw new Error('invalid intent');
  if (!Array.isArray(deckIds) || deckIds.length < 10 || deckIds.length > 75 || deckIds.some(id => typeof id !== 'string' || !Object.hasOwn(cardDefinitions,id))) throw new Error('invalid deck');
  const deck = deckIds.map((id, i) => ({ instance: `starter-${i}`, id, upgraded: false }));
  if (order && (order.length !== deck.length || new Set(order).size !== deck.length || order.some(n => !Number.isInteger(n) || n < 0 || n >= deck.length))) throw new Error('invalid order');
  const shuffled = shuffle(deck, seed);
  const state = { ...initial([], enemies), hp: 60, maxHp: 60, phase: 'player', deckSize: deck.length, draw: order ? order.map(i => deck[i]) : shuffled.cards, rng: shuffled.seed, relicEnabled: relic, relicUsed: false, log: [] };
  draw(state, 5);
  return state;
}
function validateBattle(state) {
  const natural = value => Number.isSafeInteger(value) && value >= 0;
  if (!['hp','maxHp','energy','block','turn','infusion','rng'].every(key => natural(state[key])) || state.turn < 1 || state.maxHp < 1 || state.hp > state.maxHp || state.energy > 3 || state.infusion > 2 || state.rng > 0xffffffff) throw new Error('invalid numeric state');
  if ((state.nextDrawBonus!==undefined && (!natural(state.nextDrawBonus)||state.nextDrawBonus>2)) || (state.defenseAttackBonus!==undefined&&(!natural(state.defenseAttackBonus)||state.defenseAttackBonus>3)))throw new Error('invalid power reward');
  if(state.endInfusionUses!==undefined&&(!natural(state.endInfusionUses)||state.endInfusionUses>3))throw new Error('invalid infusion power usage');
  if(['weak','vulnerable'].some(k=>state[k]!==undefined&&(!natural(state[k])||state[k]>99)))throw new Error('invalid condition');
  if(['preventVulnerable','preventReflect'].some(k=>state[k]!==undefined&&typeof state[k]!=='boolean'))throw new Error('invalid prevention');
  if(state.enemies.some(e=>e.thorns!==undefined&&(!natural(e.thorns)||e.thorns>99)))throw new Error('invalid thorns');
  if(state.attackDiscount!==undefined && (!natural(state.attackDiscount)||state.attackDiscount!==1))throw new Error('invalid attack discount');
  if(state.rearmWedge!==undefined && typeof state.rearmWedge!=='boolean')throw new Error('invalid rearm flag');
  if (state.powers!==undefined && (typeof state.powers!=='object' || state.powers===null || Array.isArray(state.powers) || Object.entries(state.powers).some(([k,v])=>!Object.hasOwn({wedgeBlock:3,firstInfused:2,recastBlock:2,expiryBlock:5,defenseAttack:3,killDraw:2,exhaustDraw:2,endInfusion:3},k)||!natural(v)||v<1||v>({wedgeBlock:3,firstInfused:2,recastBlock:2,expiryBlock:5,defenseAttack:3,killDraw:2,exhaustDraw:2,endInfusion:3}[k])))) throw new Error('invalid powers');
  if (['attackPlayed','wedgePowerUsed','killPowerUsed','defensePowerUsed','exhaustPowerUsed'].some(k=>state[k]!==undefined&&typeof state[k]!=='boolean') || (state.recastPowerUses!==undefined&&(!natural(state.recastPowerUses)||state.recastPowerUses>3)))throw new Error('invalid power usage');
  if (state.delayedWedge !== undefined && typeof state.delayedWedge !== 'boolean') throw new Error('invalid delayed wedge');
  if (state.phaseReduction !== undefined && state.phaseReduction !== 2) throw new Error('invalid phase reduction');
  if (state.playedThisTurn !== undefined && (!natural(state.playedThisTurn) || state.playedThisTurn > 10)) throw new Error('invalid action count');
  if (state.drawDebt !== undefined && (!natural(state.drawDebt) || state.drawDebt > 3)) throw new Error('invalid draw debt');
  if (state.drawLocked !== undefined && typeof state.drawLocked !== 'boolean') throw new Error('invalid draw lock');
  if (state.nextBlock !== undefined && (!natural(state.nextBlock) || state.nextBlock > 30)) throw new Error('invalid deferred block');
  if (state.wedgeUntil !== null && (!natural(state.wedgeUntil) || state.wedgeUntil < state.turn || state.wedgeUntil > state.turn + 2)) throw new Error('invalid wedge state');
  if (typeof state.relicEnabled !== 'boolean' || typeof state.relicUsed !== 'boolean') throw new Error('invalid relic state');
  if (!Array.isArray(state.enemies) || !state.enemies.length || state.enemies.some(e => !['hp','block','intent'].every(key => natural(e[key])))) throw new Error('invalid enemy state');
  if (state.enemies.some(e => e.attackReduction !== undefined && (!natural(e.attackReduction) || e.attackReduction > 4))) throw new Error('invalid attack reduction');
  if (state.enemies.some(e => (e.nextHitBonus !== undefined && e.nextHitBonus !== 2) || (e.attackedThisTurn !== undefined && typeof e.attackedThisTurn !== 'boolean'))) throw new Error('invalid attack history');
  if (!['player','won','lost'].includes(state.phase) || (state.phase === 'player' && (!state.hp || state.enemies.every(e => !e.hp)))) throw new Error('invalid terminal state');
  if (!['hand','draw','discard','exhaust','log'].every(key => Array.isArray(state[key])) || state.hand.length > 10) throw new Error('invalid zones');
  const instances = [...state.hand,...state.draw,...state.discard,...state.exhaust];
  if (!Number.isSafeInteger(state.deckSize) || state.deckSize < 10 || state.deckSize > 75 || instances.length !== state.deckSize || new Set(instances.map(c => c.instance)).size !== state.deckSize || instances.some(c => !Object.hasOwn(cardDefinitions,c.id) || typeof c.instance !== 'string' || typeof c.upgraded !== 'boolean' || (c.retainOnce !== undefined && typeof c.retainOnce !== 'boolean'))) throw new Error('invalid instances');
}
function resolveAction(input, instance, target, options = {}) {
  if (input.phase !== 'player') throw new Error('not player phase');
  const state = play(input, instance, target, {...options, drawCards:Array.isArray(input.draw)?draw:undefined});
  if (options.cancel) return state;
  return completeAction(input,state);
}
function completeAction(input,state) {
  const setup = input.wedgeUntil === null && state.wedgeUntil !== null;
  if (setup && state.relicEnabled && !state.relicUsed) {
    state.block += starterRelic.effect.amount;
    state.relicUsed = true;
    state.log.push({ event: starterRelic.effect.trigger, block: starterRelic.effect.amount });
  }
  if(state.hp===0)state.phase='lost';else if (state.enemies.every(e => e.hp === 0)) state.phase = 'won';
  return state;
}
export function useCard(input, instance, target, options = {}) {
  validateBattle(input);
  return resolveAction(input, instance, target, options);
}
// Preview has no access to a future pile. No draw effects are supported in KQ-0.2.
export function previewVisible(view, instance, target) {
  return resolveAction({ ...structuredClone(view), discard: [], exhaust: [], log: [] }, instance, target);
}
export function finishTurn(input) {
  validateBattle(input);
  if (input.phase !== 'player') throw new Error('not player phase');
  let state = endTurn(input);
  const endSetup=input.delayedWedge && (input.wedgeUntil===null || input.wedgeUntil<=input.turn) && state.wedgeUntil!==null;
  if(endSetup && state.relicEnabled && !state.relicUsed){state.block+=starterRelic.effect.amount;state.relicUsed=true;state.log.push({event:starterRelic.effect.trigger,block:starterRelic.effect.amount});}
  for (const enemy of state.enemies) {
    if (!enemy.hp) continue;
    const attack = Math.floor(Math.max(0, enemy.intent - (enemy.attackReduction ?? 0) - (state.phaseReduction ?? 0))*((state.vulnerable??0)>0?1.5:1));
    const absorbed = Math.min(state.block, attack);
    state.block -= absorbed;
    const loss = Math.min(state.hp, attack - absorbed);
    state.hp -= loss;
    state.log.push({ event: 'enemy_attack', loss });
    if (!state.hp) { state.phase = 'lost'; delete state.phaseReduction; for (const e of state.enemies) delete e.attackReduction; return state; }
  }
  delete state.phaseReduction;
  for (const enemy of state.enemies) delete enemy.attackReduction;
  for(const k of ['weak','vulnerable'])if(state[k])state[k]--;
  state = nextTurn(state);
  draw(state, Math.max(0,5-(state.drawDebt??0)+(state.nextDrawBonus??0)));
  delete state.drawDebt;
  delete state.nextDrawBonus;
  return state;
}
// Policies may only inspect this view: never expose draw order or future RNG.
export function playerView(state) {
  return structuredClone({ turn: state.turn, hp: state.hp, energy: state.energy, block: state.block, hand: state.hand, enemies: state.enemies, wedgeUntil: state.wedgeUntil, infusion: state.infusion, phase: state.phase, relicEnabled: state.relicEnabled, relicUsed: state.relicUsed, ...(state.weak===undefined?{}:{weak:state.weak}), ...(state.vulnerable===undefined?{}:{vulnerable:state.vulnerable}), ...(state.preventVulnerable===undefined?{}:{preventVulnerable:state.preventVulnerable}), ...(state.preventReflect===undefined?{}:{preventReflect:state.preventReflect}), ...(state.attackDiscount===undefined?{}:{attackDiscount:state.attackDiscount}), ...(state.rearmWedge===undefined?{}:{rearmWedge:state.rearmWedge}), ...(state.exhaustPowerUsed===undefined?{}:{exhaustPowerUsed:state.exhaustPowerUsed}), ...(state.endInfusionUses===undefined?{}:{endInfusionUses:state.endInfusionUses}), ...(state.nextDrawBonus===undefined?{}:{nextDrawBonus:state.nextDrawBonus}), ...(state.defenseAttackBonus===undefined?{}:{defenseAttackBonus:state.defenseAttackBonus}), ...(state.killPowerUsed===undefined?{}:{killPowerUsed:state.killPowerUsed}), ...(state.defensePowerUsed===undefined?{}:{defensePowerUsed:state.defensePowerUsed}), ...(state.powers===undefined?{}:{powers:state.powers}), ...(state.attackPlayed===undefined?{}:{attackPlayed:state.attackPlayed}), ...(state.wedgePowerUsed===undefined?{}:{wedgePowerUsed:state.wedgePowerUsed}), ...(state.recastPowerUses===undefined?{}:{recastPowerUses:state.recastPowerUses}), ...(state.delayedWedge === undefined ? {} : {delayedWedge:state.delayedWedge}), ...(state.phaseReduction === undefined ? {} : {phaseReduction:state.phaseReduction}), ...(state.playedThisTurn === undefined ? {} : {playedThisTurn:state.playedThisTurn}), ...(state.drawDebt === undefined ? {} : {drawDebt:state.drawDebt}), ...(state.drawLocked === undefined ? {} : {drawLocked:state.drawLocked}), ...(state.nextBlock === undefined ? {} : {nextBlock:state.nextBlock}), drawCount: state.draw.length, discardCount: state.discard.length });
}

// Explicit research event adapter; no hidden enemy AI or official runtime claim.
export function applyCondition(input,kind,stacks){validateBattle(input);if(input.phase!=='player'||!['weak','vulnerable'].includes(kind)||!Number.isSafeInteger(stacks)||stacks<1||stacks>99)throw new Error('invalid condition event');const state=structuredClone(input);if(kind==='vulnerable'&&state.preventVulnerable){delete state.preventVulnerable;return state;}state[kind]=Math.min(99,(state[kind]??0)+stacks);return state;}

// In-memory research session: continuation stays private, never serialized or replayed.
export function createChoiceSession(initialState) {
  validateBattle(initialState);
  let state=structuredClone(initialState), revision=0, pending=null, failed=false;
  const check=rev=>{if(rev!==revision)throw new Error('stale revision');if(failed)throw new Error('session faulted');};
  function view(){return structuredClone({revision,...playerView(pending?.state??state),
    phase:failed?'faulted':pending?'choice':state.phase,
    pending:pending?{token:pending.token,kind:pending.kind,inUse:pending.inUse,options:pending.options}:null});}
  function accept(step,steps,input){
    if(step.done){const next=completeAction(input,step.value);validateBattle(next);state=next;pending=null;}
    else pending={...step.value,steps,input,token:`choice-${revision+1}`};
    revision++;return view();
  }
  return Object.freeze({view,
    begin(rev,instance,target,options={}){
      check(rev);if(pending)throw new Error('choice pending');
      if(state.phase!=='player')throw new Error('not player phase');
      if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['retain','move','purge'].includes(k)))throw new Error('invalid options');
      const input=structuredClone(state), steps=playSteps(input,instance,target,{...structuredClone(options),drawCards:draw});
      return accept(steps.next(),steps,input);
    },
    resume(rev,token,instance){
      check(rev);if(!pending||token!==pending.token)throw new Error('invalid choice token');
      if(typeof instance!=='string'||!pending.options.some(c=>c.instance===instance))throw new Error('invalid revealed choice');
      const current=pending;
      try{return accept(current.steps.next(instance),current.steps,current.input);}
      catch(error){failed=true;revision++;throw error;} // never refund/replay an already revealed payment
    },
    end(rev){check(rev);if(pending)throw new Error('choice pending');const next=finishTurn(state);validateBattle(next);state=next;revision++;return view();}
  });
}
