// Isolated mechanism laboratory, not the production combat engine.
import catalog from './cards.json' with { type: 'json' };
import { currentIntent } from './intent.mjs';
import { drawCards, takeTop } from './deck.mjs';
export { catalog };
const byId = new Map(catalog.cards.map(card => [card.id, card]));
export function state({ hp = catalog.maxHp, energy = catalog.energyPerTurn, enemies = [{ hp: 30, block: 0 }], hand = [], draw = [], startingRelic = false } = {}) {
  return { hp, energy, enemies: structuredClone(enemies), hand: [...hand], draw: [...draw], discard: [], exhaust: [], block: 0, mask: 0, calmAttackGuard: 0, reservedBlock: 0, entryGuard: 0, exhaustGuard: 0, reservedEnergy: 0, carryBlock: 0, attacksPlayed: 0, maskGuard: 0, exitGuard: 0, calmDraw: 0, maskedAttackDraw: 0, maskedDrawUsed: false, powers: [], turn: 1, phase: 'player', deckMode: 'fixed', startingRelic, relicUsed: false };
}
const nonnegative = value => Number.isSafeInteger(value) && value >= 0;
export function validState(s) {
  if (!s || typeof s !== 'object') return false;
  if (![s.calmAttackGuard, s.reservedBlock, s.entryGuard, s.exhaustGuard, s.reservedEnergy, s.carryBlock, s.attacksPlayed, s.hp, s.energy, s.block, s.mask, s.maskGuard, s.exitGuard, s.calmDraw, s.maskedAttackDraw].every(nonnegative)) return false;
  if (!['fixed', 'shuffle'].includes(s.deckMode)) return false;
  if (s.deckMode === 'shuffle' && (!Number.isInteger(s.rng) || s.rng < 0 || s.rng > 0xffffffff)) return false;
  if (s.hp > catalog.maxHp || s.mask > catalog.maskRules.maxDuration) return false;
  if (!Number.isSafeInteger(s.turn) || s.turn < 1 || !['player','enemy'].includes(s.phase)) return false;
  if (typeof s.startingRelic !== 'boolean' || typeof s.relicUsed !== 'boolean' || typeof s.maskedDrawUsed !== 'boolean') return false;
  if (!['hand','draw','discard','exhaust','powers'].every(key => Array.isArray(s[key]) && s[key].every(id => typeof id === 'string'))) return false;
  if (s.hand.length > 10 || !Array.isArray(s.enemies) || !s.enemies.length) return false;
  return s.enemies.every(e => e && nonnegative(e.hp) && nonnegative(e.block) && (e.suppression===undefined||nonnegative(e.suppression)));
}
function damage(enemy, amount) {
  if (enemy.hp <= 0) return;
  const absorbed = Math.min(enemy.block, amount);
  enemy.block -= absorbed;
  enemy.hp = Math.max(0, enemy.hp - amount + absorbed);
}
function exhaustCards(s,cards) { s.exhaust.push(...cards);s.block+=cards.length*s.exhaustGuard; }
function setMaskFromCard(s,value) {
  const exited=s.mask>0&&value===0;s.mask=value;
  if(exited)s.block+=s.exitGuard;
}
function apply(s, effect, target) {
  const { op, value } = effect;
  if (op === 'loseHp') s.hp -= value;
  else if (op === 'mask') {
    const entered = s.mask === 0 && value > 0;
    setMaskFromCard(s,value === 0 ? 0 : Math.min(catalog.maskRules.maxDuration, Math.max(s.mask, value)));
    if(entered)s.block+=s.entryGuard;
    if (entered && s.startingRelic && !s.relicUsed) {
      s.relicUsed = true;
      for (const bonus of catalog.startingRelic.effects) apply(s, bonus, target);
    }
  }
  else if (op === 'pierceDamage') { const enemy=s.enemies[target];enemy.hp=Math.max(0,enemy.hp-value-(s.mask>0?catalog.maskRules.attackBonus:0)); }
  else if (op === 'stealBlock') { const enemy=s.enemies[target],taken=Math.min(value,enemy.block);enemy.block-=taken;s.block+=taken; }
  else if (op === 'calmAttackGuard') s.calmAttackGuard+=value;
  else if (op === 'harvestAll') { let kills=0;for(const enemy of s.enemies){const alive=enemy.hp>0;damage(enemy,value+(s.mask>0?catalog.maskRules.attackBonus:0));if(alive&&enemy.hp===0)kills++;}drawCards(s,Math.min(effect.cap,kills)); }
  else if (op === 'reserveBlock') s.reservedBlock+=value;
  else if (op === 'maskBurstAll') { const amount=s.mask*value+(s.mask>0?catalog.maskRules.attackBonus:0);for(const enemy of s.enemies)damage(enemy,amount); }
  else if (op === 'suppressAll') { for(const enemy of s.enemies.filter(e=>e.hp>0)){currentIntent(s,enemy);enemy.suppression=(enemy.suppression??0)+value;} }
  else if (op === 'extendMask') { if(s.mask>0)s.mask=Math.min(catalog.maskRules.maxDuration,s.mask+value); }
  else if (op === 'entryGuard') s.entryGuard+=value;
  else if (op === 'missingHpDamage') damage(s.enemies[target],value+Math.min(effect.cap,Math.floor((catalog.maxHp-s.hp)/effect.step)*effect.bonus)+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'refillHand') drawCards(s,Math.max(0,value-s.hand.length));
  else if (op === 'emptyHandDamage') damage(s.enemies[target],value+(s.hand.length===0?effect.bonus:0)+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'exhaustGuard') s.exhaustGuard+=value;
  else if (op === 'burnTopDraw') { const id=takeTop(s);if(id!==null){exhaustCards(s,[id]);drawCards(s,value);} }
  else if (op === 'reserveEnergy') s.reservedEnergy+=value;
  else if (op === 'damageGuard') { const enemy=s.enemies[target],before=enemy.hp;damage(enemy,value+(s.mask>0?catalog.maskRules.attackBonus:0));s.block+=Math.min(effect.cap,before-enemy.hp); }
  else if (op === 'carryBlock') s.carryBlock+=value;
  else if (op === 'killDraw') { if(s.enemies[target].hp===0)drawCards(s,value); }
  else if (op === 'sequenceDamage') damage(s.enemies[target],value+Math.min(effect.cap,s.attacksPlayed)*effect.bonus+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'beforeAttackBlock') s.block+=value+(s.attacksPlayed===0?effect.bonus:0);
  else if (op === 'topdeckAttack') { const i=s.discard.findIndex(id=>byId.get(id)?.kind==='attack');if(i>=0)s.draw.unshift(s.discard.splice(i,1)[0]); }
  else if (op === 'enemyCountBlock') s.block+=Math.min(effect.cap,s.enemies.filter(e=>e.hp>0).length)*value;
  else if (op === 'blockDamage') damage(s.enemies[target],Math.min(effect.cap,s.block*value)+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'spendBlockDraw') { const count=Math.min(effect.cap,Math.floor(s.block/value));s.block=0;drawCards(s,count); }
  else if (op === 'maskedAttackDraw') s.maskedAttackDraw+=value;
  else if (op === 'damageHits') { for(let n=0;n<effect.hits;n++)damage(s.enemies[target],value+(s.mask>0?catalog.maskRules.attackBonus:0)); }
  else if (op === 'calmDraw') s.calmDraw+=value;
  else if (op === 'exitEnergy') { if(s.mask>0){setMaskFromCard(s,0);s.energy+=value;} }
  else if (op === 'suppress') { currentIntent(s,s.enemies[target]);s.enemies[target].suppression=(s.enemies[target].suppression??0)+value; }
  else if (op === 'coveredDraw') {
    const incoming=s.enemies.filter(e=>e.hp>0).map(e=>currentIntent(s,e)).reduce((a,b)=>a+b,0);
    if(!Number.isSafeInteger(incoming))throw new TypeError('intent sum overflow');
    if(s.block>=incoming)drawCards(s,value);
  }
  else if (op === 'exitGuard') s.exitGuard+=value;
  else if (op === 'shortenMask') setMaskFromCard(s,Math.max(0,s.mask-value));
  else if (op === 'lastMaskDamage') damage(s.enemies[target],value+(s.mask===1?effect.bonus:0)+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'threatDamage') damage(s.enemies[target],value+(currentIntent(s,s.enemies[target])>0?effect.bonus:0)+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'quietDraw') { if(s.enemies.filter(e=>e.hp>0).map(e=>currentIntent(s,e)).every(n=>n===0))drawCards(s,value); }
  else if (op === 'spendEnergyBlock') { s.block+=s.energy*value;s.energy=0; }
  else if (op === 'discardAttacksDraw') {
    const removed=s.hand.filter(id=>byId.get(id)?.kind==='attack');
    s.hand=s.hand.filter(id=>byId.get(id)?.kind!=='attack');s.discard.push(...removed);
    if(removed.length)drawCards(s,removed.length+value);
  }
  else if (op === 'exhaustDamage') damage(s.enemies[target],Math.min(effect.cap,s.exhaust.length*value)+(s.mask>0?catalog.maskRules.attackBonus:0));
  else if (op === 'exhaustBlock') s.block+=Math.min(effect.cap,s.exhaust.length*value);
  else if (op === 'unmaskedDraw') { if(s.mask === 0) drawCards(s,value); }
  else if (op === 'burnSkillsBlock') {
    const removed=s.hand.filter(id=>byId.get(id)?.kind==='skill');
    s.hand=s.hand.filter(id=>byId.get(id)?.kind!=='skill');
    exhaustCards(s,removed);s.block+=removed.length*value;
  }
  else if (op === 'energy') s.energy += value;
  else if (op === 'breakBlock') s.enemies[target].block = 0;
  else if (op === 'recoverExit') {
    for(let n=0;n<value && s.hand.length<10;n++){
      const i=s.discard.findIndex(id=>byId.get(id)?.base.some(e=>(e.op==='mask'&&e.value===0)||e.op==='exitEnergy'));
      if(i<0)break;
      s.hand.push(s.discard.splice(i,1)[0]);
    }
  }
  else if (op === 'maskGuard') s.maskGuard += value;
  else if (op === 'maskBlock') s.block += s.mask > 0 ? value : value / 2;
  else if (op === 'block') s.block += value;
  else if (op === 'draw') {
    drawCards(s, value);
  } else if (op === 'damage' || op === 'plunge' || op === 'damageAll') {
    const targets = (op === 'damageAll' || op === 'plunge' && s.mask > 0) ? s.enemies : [s.enemies[target]];
    for (const enemy of targets) damage(enemy, value + (s.mask > 0 ? catalog.maskRules.attackBonus : 0));
  } else throw new Error(`Unknown effect: ${op}`);
}
export function play(input, { index, target = 0, upgraded = false, cancel = false }) {
  // A caller always receives a fresh result; rejection cannot spend cards/resources.
  const reject = reason => ({ ok: false, reason, state: structuredClone(input) });
  if (!validState(input)) return reject('state');
  if (cancel) return reject('cancelled');
  if (input.phase !== 'player') return reject('phase');
  if (!Number.isInteger(index) || index < 0 || index >= input.hand.length) return reject('card');
  if (typeof upgraded !== 'boolean') return reject('upgrade');
  const card = byId.get(input.hand[index]);
  if (!card) return reject('unknown-card');
  if (input.hp <= 0 || !input.enemies.some(e => e.hp > 0)) return reject('combat-ended');
  if (input.energy < card.cost) return reject('energy');
  const effects = upgraded ? card.upgrade : card.base;
  const lifeCost = effects.filter(e => e.op === 'loseHp').reduce((n, e) => n + e.value, 0);
  if (input.hp <= lifeCost) return reject('life');
  const needsTarget = effects.some(e => e.op === 'pierceDamage' || e.op === 'stealBlock' || e.op === 'missingHpDamage' || e.op === 'emptyHandDamage' || e.op === 'damageGuard' || e.op === 'killDraw' || e.op === 'sequenceDamage' || e.op === 'blockDamage' || e.op === 'damageHits' || e.op === 'suppress' || e.op === 'lastMaskDamage' || e.op === 'threatDamage' || e.op === 'exhaustDamage' || e.op === 'breakBlock' || e.op === 'damage' || e.op === 'plunge' && input.mask === 0);
  if (needsTarget && (!Number.isInteger(target) || !input.enemies[target] || input.enemies[target].hp <= 0)) return reject('target');
  const s = structuredClone(input);
  s.energy -= card.cost;
  s.hand.splice(index, 1); // resolving card no longer occupies the hand
  try {
    for (const effect of effects) apply(s, effect, target);
    if(card.kind==='attack'){s.attacksPlayed++;if(input.mask===0)s.block+=s.calmAttackGuard;}
    if(card.kind==='attack' && input.mask>0 && s.maskedAttackDraw>0 && !s.maskedDrawUsed){
      s.maskedDrawUsed=true;drawCards(s,s.maskedAttackDraw);
    }
  }
  catch { return reject('effect'); }
  if(card.kind==='power')s.powers.push(card.id);else if(card.exhaust)exhaustCards(s,[card.id]);else s.discard.push(card.id);
  if (!validState(s)) return reject('effect');
  return { ok: true, state: s };
}
export function endTurn(input) {
  const s = structuredClone(input);
  if (!validState(input)) return s;
  if (s.phase !== 'player' || s.hp <= 0 || !s.enemies.some(e => e.hp > 0)) return s;
  s.phase = 'enemy';
  // Before enemy action; block does not prevent HP loss. This adaptation can kill.
  if (s.mask > 0) { s.hp = Math.max(0, s.hp - catalog.maskRules.endTurnHpLoss); if(s.hp > 0) s.block += s.maskGuard; s.mask--; }
  s.discard.push(...s.hand);
  s.hand = [];
  return validState(s) ? s : structuredClone(input);
}
export function startTurn(input) {
  const s = structuredClone(input);
  if (!validState(input)) return s;
  if (s.phase !== 'enemy' || s.hp <= 0 || !s.enemies.some(e => e.hp > 0)) return s;
  s.phase = 'player';
  s.turn++;s.attacksPlayed=0;s.maskedDrawUsed=false; for(const e of s.enemies) if(e.suppression!==undefined)e.suppression=0; s.block = Math.min(s.block,s.carryBlock)+s.reservedBlock;s.reservedBlock=0; s.energy = catalog.energyPerTurn+s.reservedEnergy;s.reservedEnergy=0;
  apply(s, { op: 'draw', value: catalog.drawPerTurn });
  if(s.mask===0)drawCards(s,s.calmDraw);
  return validState(s)?s:structuredClone(input);
}
export function cardText(card, upgraded = false) {
  if(typeof upgraded !== 'boolean') throw new TypeError('upgrade must be boolean');
  const text = ({op, value, cap, bonus, hits, step}) => ({
    pierceDamage: `造成${value}点无视目标格挡的伤害（面具另加${catalog.maskRules.attackBonus}）；不移除格挡，仍算攻击，不是支付生命。`,
    stealBlock: `将目标至多${value}点现有格挡转为自己的格挡，无格挡则获得0；不造成伤害。`,
    calmAttackGuard: `本场每张出牌时未戴面具的攻击结算后获得${value}点格挡，按卡非命中，可叠加；进场攻击按出牌前状态，零伤成功攻击也算。`,
    harvestAll: `对所有敌人造成${value}点伤害（有面具另加${catalog.maskRules.attackBonus}）；每实际击杀1名抽1张，最多${cap}张，死敌不计，手牌上限10。`,
    reserveBlock: `下个玩家回合开始一次获得${value}点格挡，随后清除储备；本回合不获盾，可叠加，不跨战。`,
    maskBurstAll: `对所有敌人造成当前剩余面具回合数×${value}点伤害；有面具另加${catalog.maskRules.attackBonus}点，无面具零伤。`,
    suppressAll: `所有存活敌人本回合意图伤害降低${value}（最低0，可叠加）；下个玩家回合清除。`,
    extendMask: `已有面具延长${value}回合，最多${catalog.maskRules.maxDuration}；无面具不进入、不触发入场。延长后仍须支付每回合生命，可能致死。`,
    entryGuard: `本场每次从无面具实际进入面具获得${value}点格挡；刷新不算，不追溯，可叠加。`,
    missingHpDamage: `造成${value}点伤害；每已损失${step}点生命另加${bonus}点，额外最多${cap}点；面具另加${catalog.maskRules.attackBonus}点。不再扣血，也不回血。`,
    refillHand: `抽牌直到手中有${value}张；打出的本牌已离手，已有不少于该数量则不抽；不保证空牌库也能补满。`,
    emptyHandDamage: `造成${value}点伤害，若本牌离手后没有其他手牌，额外${bonus}点；面具另加${catalog.maskRules.attackBonus}点。后续能力抽牌不影响此判定。`,
    exhaustGuard: `本场每实际消耗一张牌获得${value}点格挡；包括自身消耗的牌，可叠加，不追溯此前消耗。`,
    burnTopDraw: `消耗抽牌堆顶1张（空堆按正常规则洗弃牌堆）；实际消耗成功后抽${value}张，无牌可消耗则不抽。不能选择牺牲牌，手牌上限10。`,
    reserveEnergy: `下个玩家回合开始时一次性获得${value}点额外能量，随后清除储备；本回合不返能，可叠加，不跨战。`,
    damageGuard: `造成${value}点伤害（面具另加${catalog.maskRules.attackBonus}）；按实际削减的目标生命获得格挡，最多${cap}点；被格挡部分不计，不回血。`,
    carryBlock: `本场每次玩家回合开始，保留至多${value}点剩余格挡而非全部移除；保留上限可叠加，不生成格挡。`,
    killDraw: `若选中目标已被本牌击杀，抽${value}张（手牌上限10）；未击杀不抽。`,
    sequenceDamage: `造成${value}点伤害，本回合此前每张成功打出的攻击另加${bonus}点，最多计${cap}张；本牌不计自身，面具另加${catalog.maskRules.attackBonus}点。`,
    beforeAttackBlock: `获得${value}点格挡；若本回合尚未成功打出攻击，额外${bonus}点。`,
    topdeckAttack: '将弃牌堆中按顺序首张攻击放至抽牌堆顶（不立即抽，无则略过）。',
    enemyCountBlock: `每名存活敌人获得${value}点格挡，最多计算${cap}名。`,
    blockDamage: `按当前格挡每点造成${value}点伤害，最多${cap}点；不移除格挡，面具另加${catalog.maskRules.attackBonus}点。`,
    spendBlockDraw: `移除全部格挡，每满${value}点抽1张，最多${cap}张（手牌上限10）；不足部分也移除。`,
    damageHits: `对目标造成${value}点伤害，共${hits}次；面具期间每次另加${catalog.maskRules.attackBonus}点。不转移死亡目标。`,
    maskedAttackDraw: `本场每回合首次在出牌时戴面具的攻击结算后抽${value}张（上限10）；每张攻击最多触发一次，退场攻击仍算，可叠加抽量。尚未有此能力时的攻击不消耗资格；追加同类能力不重置已耗资格。`,
    calmDraw: `本场每个玩家回合开始，若无面具，在正常抽牌后额外抽${value}张（总手牌上限10）；本次打出不立即抽，可叠加。`,
    exitEnergy: `若当前有面具，退出并获得${value}点本回合能量；无面具不返能。仍须先支付费用。`,
    suppress: `目标本回合意图伤害降低${value}（最低0，可叠加）；下个玩家回合清除。`,
    coveredDraw: `若此时格挡覆盖所有存活敌人当前意图伤害之和，抽${value}张牌。面具耗血不算敌攻。`,
    exitGuard: `本场每次卡牌使面具从有变无，获得${value}点格挡；自然到期不触发，可叠加。`,
    shortenMask: `面具剩余回合减少${value}（最低0）；不是保证退出。`,
    lastMaskDamage: `造成${value}点伤害；若面具恰剩1回合，额外${bonus}点；面具期间另加${catalog.maskRules.attackBonus}点。不改变面具时长。`,
    threatDamage: `造成${value}点伤害；若目标当前意图为攻击，额外${bonus}点；面具期间另加${catalog.maskRules.attackBonus}点。`,
    quietDraw: `若所有存活敌人当前意图均不造成伤害，抽${value}张牌（手牌上限10）；否则不抽。`,
    spendEnergyBlock: `消耗所有剩余能量，每点获得${value}点格挡（0能量可打出但不获盾）。`,
    discardAttacksDraw: `弃掉手中所有其他攻击牌；若至少弃1张，抽弃牌张数${value?'加'+value:''}的牌（手牌上限10），可能洗回刚弃的攻击。`,
    exhaustDamage: `每张已消耗牌造成${value}点伤害，最多${cap}点；面具期间另加${catalog.maskRules.attackBonus}点。`,
    exhaustBlock: `每张已消耗牌获得${value}点格挡，最多${cap}点。`,
    unmaskedDraw: `若当前没有面具，抽${value}张牌（手牌上限10）；有面具则不抽。`,
    burnSkillsBlock: `消耗手中所有其他技能牌，每张获得${value}点格挡；没有则不获格挡。`,
    energy: `获得${value}点能量（仅本回合）。`,
    breakBlock: '移除目标所有格挡。',
    recoverExit: `从弃牌堆按顺序取回至多${value}张含退出面具效果的牌；手牌上限10，没有则不取。`,
    damageAll: `对所有敌人造成${value}点伤害（面具期间+${catalog.maskRules.attackBonus}）。`,
    maskBlock: `获得${value / 2}点格挡；面具期间改为${value}点。`,
    maskGuard: `本场战斗每个面具回合末，先支付生命；若存活，获得${value}点格挡。可叠加。`,
    damage: `造成${value}点伤害（面具期间+${catalog.maskRules.attackBonus}）。`,
    block: `获得${value}点格挡。`,
    loseHp: `失去${value}点生命（须保留至少1点）。`,
    mask: value ? `进入面具状态${value}回合（取更长，不相加）；攻击+${catalog.maskRules.attackBonus}；每回合结束先失去${catalog.maskRules.endTurnHpLoss}生命再减少1回合，可致死。` : '退出面具状态。',
    plunge: `造成${value}点伤害；面具期间改为对所有敌人造成${value + catalog.maskRules.attackBonus}点伤害。`,
    draw: `抽${value}张牌（手牌上限10）。`,
  })[op];
  return `${card.cost}费。` + (upgraded ? card.upgrade : card.base).map(text).join('') + (card.kind === 'power' ? '能力：离开牌堆，本场生效。' : card.exhaust ? '消耗。' : '');
}
