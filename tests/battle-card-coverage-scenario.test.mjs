import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCoverageFixture,coveragePlan} from '../scripts/battle-card-coverage-scenario.mjs';

const cards = readFileSync(new URL('../data/cards.json',import.meta.url));
const contract = readFileSync(new URL('../src/lua/abyss_run_red_card_contract.lua',import.meta.url));

test('two real-card groups cover every existing RED75 rarity/type cell and distinct cost states', () => {
  const matrix = coveragePlan(JSON.parse(cards),String(contract),'matrix');
  assert.equal(matrix.expected.length,10);
  assert.equal(matrix.legalCells.length,10);
  assert.deepEqual(matrix.coveredCells,matrix.legalCells);
  assert.deepEqual(matrix.absentCells,['basic/power','common/power']);
  const mechanics = coveragePlan(JSON.parse(cards),String(contract),'mechanics');
  assert.equal(mechanics.expected.length,10);
  for (const cost of [0,1,2,4,'X',-2]) assert.ok(mechanics.expected.some(card => card.cost === cost),`missing cost ${cost}`);
  assert.equal(mechanics.expected.find(card => card.id === 'regret').acquisition,'curse-acquisition');
  assert.ok(mechanics.expected.some(card => card.upgraded));
  assert.ok(mechanics.expected.some(card => card.exhaust));
  assert.equal(mechanics.expected.find(card => card.id === 'perfected_strike').textLength,35);
  const status=coveragePlan(JSON.parse(cards),String(contract),'status');
  assert.equal(status.expected.length,10);
  assert.deepEqual(status.expected.filter(card=>card.acquisition==='combat-generated').map(card=>[card.id,card.type,card.rarity]),
    [['wound','status','common'],['dazed','status','common'],['burn','status','common'],['slimed','status','common']]);
  assert.equal(status.expected.find(card=>card.id==='necronomicurse').rarity,'special');
  assert(!status.coveredCells.some(cell=>cell.endsWith('/status')||cell.endsWith('/curse')),'generated statuses/curses are outside RED75 grid');
  assert.throws(() => coveragePlan(JSON.parse(cards),String(contract),'invented'),/Coverage group/);
  const altered = JSON.parse(cards);altered.cards.find(card => card.id === 'regret').type='power';
  assert.throws(() => coveragePlan(altered,String(contract),'mechanics'),/Not an approved/);
});

test('fixture receipt hashes the source and modifies only GameUI with real acquisition/draw and runtime multiset guards', () => {
  const original = {meta:{name:'actual'},assets:{scripts:[{path:'src/abyss_game_ui.lua',source:'local M={}\nreturn M\n'},{path:'src/abyss_combat.lua',source:'untouched core'}]},presentation:{proof:42}};
  const input = Buffer.from(JSON.stringify(original));
  const {save,receipt} = buildCoverageFixture(input,cards,contract,'mechanics');
  assert.equal(save.assets.scripts[1].source,'untouched core');
  assert.deepEqual(save.presentation,original.presentation);
  assert.deepEqual(JSON.parse(input),original);
  assert.equal(receipt.gameRulesChanged,false);
  assert.equal(receipt.officialImport,false);
  assert.equal(receipt.visualAccepted,false);
  for (const field of ['inputSha256','cardsSha256','redContractSha256','originalModuleSha256','fixtureModuleSha256']) assert.match(receipt[field],/^[0-9a-f]{64}$/);
  const source=save.assets.scripts[0].source;
  for (const anchor of ['R.removeCard','R.obtainCard','R.upgradeCard','R.startCombat','C.draw(b,20)','Unexpected coverage hand entry','Coverage card missing from real hand','CARD_COVERAGE_SLOT']) assert.ok(source.includes(anchor),anchor);
  assert.doesNotMatch(source,/\.energy\s*=|\.hp\s*=|catalog\.cards\[.*\]\s*=/);
  assert.throws(() => buildCoverageFixture(Buffer.from(JSON.stringify(save)),cards,contract,'matrix'),/unmodified actual-GIL preview/);
});
