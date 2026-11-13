import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const page = readFileSync(new URL('../experiments/characters/hutao/full75/胡桃V5_75卡命名修订五战试玩版.html', import.meta.url), 'utf8');
const source = page.match(/async function copyReport\(\)[\s\S]*?(?=\ndocument\.addEventListener)/)?.[0];
assert.ok(source, 'Exercise the actual shipped report handler');
async function run({ clipboard = 'reject', fallback = false } = {}) {
  const messages = [], copied = [], nodes = [];
  const g = { phase: 'combat', wins: 1, hp: 20, maxHp: 72, deck: [{ id: 'a', upgraded: true }], logs: [{ floor: 1, turn: 2, msg: '测试日志' }] };
  const original = JSON.stringify(g);
  const context = { g, CARDS: { a: { name: '测试卡' } }, toast: message => messages.push(message),
    navigator: clipboard === 'absent' ? {} : { clipboard: { async writeText(text) { if (clipboard === 'reject') throw Error('denied'); copied.push(text); } } },
    document: { body: { appendChild: node => nodes.push(node) }, createElement() { return { style: {}, select() {}, remove() { nodes.splice(nodes.indexOf(this), 1); } }; }, execCommand(command) { assert.equal(command, 'copy'); if (fallback === 'throw') throw Error('denied'); if (fallback) copied.push(nodes[0].value); return fallback; } } };
  vm.createContext(context);
  await vm.runInContext(`${source}\ncopyReport()`, context);
  assert.equal(JSON.stringify(g), original, 'Copy must not mutate the run');
  assert.equal(nodes.length, 0, 'Temporary copy input must always be removed');
  return { messages, copied };
}
test('native clipboard success preserves report content', async () => {
  const { messages, copied } = await run({ clipboard: 'success' });
  assert.match(messages[0], /已复制/);
  assert.match(copied[0], /进度1\/5/); assert.match(copied[0], /测试卡\+/); assert.match(copied[0], /测试日志/);
});
test('native rejection falls back successfully', async () => assert.match((await run({ fallback: true })).messages[0], /本地方式复制/));
test('missing native API still supports local copy', async () => assert.match((await run({ clipboard: 'absent', fallback: true })).messages[0], /本地方式复制/));
test('false local copy result reports failure, never success', async () => {
  const { messages, copied } = await run(); assert.equal(copied.length, 0); assert.match(messages[0], /限制了剪贴板/); assert.doesNotMatch(messages[0], /已.*复制/);
});
test('throwing local copy reports failure and cleans up', async () => assert.match((await run({ fallback: 'throw' })).messages[0], /限制了剪贴板/));
test('retry after a failed copy can succeed', async () => { await run(); assert.match((await run({ clipboard: 'success' })).messages[0], /已复制/); });
