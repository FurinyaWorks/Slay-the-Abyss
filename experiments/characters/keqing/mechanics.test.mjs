import test from 'node:test';
import assert from 'node:assert/strict';
import { cards, describe, initial, play, endTurn, nextTurn } from './mechanics.mjs';
const hand = (...ids) => ids.map((id, i) => ({ instance: `i${i}`, id, upgraded: false }));
const enemy = (hp = 100, block = 0) => ({ hp, block });
for (const upgraded of [false, true]) {
  test(`independent basic values: upgraded=${upgraded}`, () => {
    for (const [id, hp, block] of [['KQ001', upgraded ? 91 : 94, 0], ['KQ002', 100, upgraded ? 8 : 5], ['KQ004', upgraded ? 90 : 92, 0], ['KQ005', upgraded ? 85 : 89, 0]]) {
      const state = initial([{ instance: 'a', id, upgraded }], [enemy(), enemy()]);
      const result = play(state, 'a', 0);
      assert.equal(result.enemies[0].hp, hp);
      assert.equal(result.block, block);
      assert.equal(result.energy, id === 'KQ005' ? 1 : 2);
      assert.equal(result.hand.length, 0);
      assert.equal(result.discard[0].instance, 'a');
      if (id === 'KQ005') assert.equal(result.enemies[1].hp, hp);
      assert.equal(state.enemies[0].hp, 100);
    }
  });
  test(`wedge setup and recast: upgraded=${upgraded}`, () => {
    let state = initial([{ instance: 'a', id: 'KQ003', upgraded }, { instance: 'b', id: 'KQ003', upgraded }], [enemy()]);
    state = play(state, 'a', 0);
    assert.equal(state.wedgeUntil, 2);
    assert.equal(state.enemies[0].hp, upgraded ? 93 : 95);
    state = play(state, 'b', 0);
    assert.equal(state.enemies[0].hp, upgraded ? 82 : 87);
    assert.equal(state.wedgeUntil, null);
    assert.equal(state.infusion, 2);
  });
  test(`detonate after killing selected target: upgraded=${upgraded}`, () => {
    const state = initial([{ instance: 'a', id: 'KQ004', upgraded }], [enemy(1), enemy()]);
    state.wedgeUntil = 2;
    const result = play(state, 'a', 0);
    assert.equal(result.enemies[0].hp, 0);
    assert.equal(result.enemies[1].hp, upgraded ? 94 : 96);
    assert.equal(result.wedgeUntil, null);
  });
}
test('two opposite reachable situations', () => {
  const seq = (enemies, order) => {
    let state = initial(hand('KQ003', 'KQ004', 'KQ001'), enemies);
    state.wedgeUntil = 1; // carried from prior turn
    for (const [card, target] of order) state = play(state, card, target);
    return state.enemies.map(e => e.hp);
  };
  assert.deepEqual(seq([enemy(40)], [['i0',0],['i1',0],['i2',0]]), [12]);
  assert.deepEqual(seq([enemy(40)], [['i1',0],['i0',0],['i2',0]]), [17]);
  assert.deepEqual(seq([enemy(12),enemy(12)], [['i1',0],['i0',1],['i2',1]]), [0,0]);
  assert.deepEqual(seq([enemy(12),enemy(12)], [['i0',0],['i1',0],['i2',1]]), [0,4]);
});
test('bonus is per hit but duration per card; no retroactive bonus', () => {
  let state = initial(hand('KQ003','KQ004','KQ001'), [enemy()]);
  state.wedgeUntil = 2;
  state = play(state, 'i0', 0);
  assert.equal(state.enemies[0].hp, 92);
  state = play(state, 'i1', 0);
  assert.equal(state.enemies[0].hp, 80);
  assert.equal(state.infusion, 1);
  state = play(state, 'i2', 0);
  assert.equal(state.enemies[0].hp, 72);
  assert.equal(state.infusion, 0);
});
test('block absorbs sequential hits; zero spill after death', () => {
  const state = initial(hand('KQ004'), [enemy(4,5),enemy()]);
  const result = play(state, 'i0', 0);
  assert.deepEqual(result.enemies, [{...enemy(1,0), attackedThisTurn:true}, enemy()]);
});
test('invalid target, insufficient energy and reused instance do not mutate input', () => {
  const state = initial(hand('KQ003'), [enemy()]);
  const original = structuredClone(state);
  assert.throws(() => play(state, 'i0', 10), /target/);
  assert.deepEqual(state, original);
  const empty = { ...state, energy: 0 };
  assert.throws(() => play(empty, 'i0', 0), /energy/);
  assert.equal(empty.wedgeUntil, null);
  const used = play(state, 'i0', 0);
  assert.throws(() => play(used, 'i0', 0), /hand/);
});
test('100 cancels cannot mint resources', () => {
  let state = initial(hand('KQ003'), [enemy()]);
  const expected = structuredClone(state);
  for (let i = 0; i < 100; i++) state = play(state, 'i0', 0, { cancel: true });
  assert.deepEqual(state, expected);
});
test('wedge survives one end turn, expires next; infusion expires immediately', () => {
  let state = play(initial(hand('KQ003'), [enemy()]), 'i0', 0);
  state.infusion = 2;
  state = endTurn(state);
  assert.equal(state.wedgeUntil, 2);
  assert.equal(state.infusion, 0);
  state = endTurn(nextTurn(state));
  assert.equal(state.wedgeUntil, null);
});
test('generated text follows both structured versions and keeps unapproved names hidden', () => {
  for (const id of Object.keys(cards)) for (const upgraded of [false,true]) {
    const text = describe(id, upgraded);
    assert.ok(text.startsWith(`待命名·${id}`));
    assert.ok(!cards[id].candidateName || !text.includes(cards[id].candidateName));
  }
  assert.match(describe('KQ004',true), /5伤害，共2段/);
  assert.match(describe('KQ003',false), /5伤害.*8伤害.*附魔2次/);
});

test('fixture hand capacity and identity reject impossible samples', () => {
  assert.equal(initial(hand(...Array(10).fill('KQ001')), [enemy()]).hand.length, 10);
  assert.throws(() => initial(hand(...Array(11).fill('KQ001')), [enemy()]), /hand/);
  const duplicate = hand('KQ001','KQ001'); duplicate[1].instance = duplicate[0].instance;
  assert.throws(() => initial(duplicate, [enemy()]), /hand/);
  assert.throws(() => initial(hand('KQ001'), [enemy(-1)]), /enemies/);
});
test('output discard instances do not alias caller hand', () => {
  const state = initial(hand('KQ001'), [enemy()]);
  const result = play(state, 'i0', 0);
  result.discard[0].upgraded = true;
  assert.equal(state.hand[0].upgraded, false);
});
test('invalid upgrade flags rejected at construction and play', () => {
  const invalid = [{instance:'a',id:'KQ001',upgraded:'false'}];
  assert.throws(() => initial(invalid,[enemy()]), /card/);
  const state = initial(hand('KQ001'),[enemy()]);
  state.hand[0].upgraded = 'false';
  assert.throws(() => play(state,'i0',0), /upgrade/);
  assert.equal(state.energy,3);
});
test('group attacks spend one infusion, skill spends none, recast refreshes after old bonus', () => {
  let state = initial(hand('KQ002','KQ005'),[enemy(),enemy()]);
  state.infusion = 2;
  state = play(state,'i0',0);
  assert.equal(state.infusion,2);
  state = play(state,'i1',0);
  assert.deepEqual(state.enemies.map(e=>e.hp),[83,83]);
  assert.equal(state.infusion,1);
  state = initial(hand('KQ003'),[enemy()]);
  state.infusion=1; state.wedgeUntil=2;
  state=play(state,'i0',0);
  assert.equal(state.enemies[0].hp,90);
  assert.equal(state.infusion,2);
});
test('terminal rejection and upgraded cancellation/expiry preserve semantics', () => {
  const state=initial([{instance:'a',id:'KQ003',upgraded:true}],[enemy()]);
  assert.deepEqual(play(state,'a',0,{cancel:true}),state);
  assert.throws(()=>play(state,'a',9), /target/);
  assert.equal(state.energy,3);
  const result=endTurn(nextTurn(endTurn(play(state,'a',0))));
  assert.equal(result.wedgeUntil,null);
  assert.throws(()=>play(initial(hand('KQ005'),[enemy(0)]),'i0',0),/ended/);
});
test('visible state rules describe bonus, spend unit, expiration and refresh', () => {
  const text=describe('KQ003');
  assert.match(text,/每段伤害\+2/);
  assert.match(text,/每张攻击牌结算后扣1次/);
  assert.match(text,/本回合结束清除/);
  assert.match(text,/下一己方回合结束清除/);
  assert.match(text,/刷新不叠加/);
});
