import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const dir = new URL('../experiments/characters/hutao/full75/', import.meta.url);
const html = readFileSync(new URL(readdirSync(dir).find(f => f.endsWith('.html')), dir), 'utf8');
const handler = html.split("document.addEventListener('keydown',")[1].split(');\n')[0];
function dispatch(overrides = {}, state = {}) {
  const calls = [];
  const context = {
    dialog: false,
    g: { phase: 'combat', hand: [{ uid: 'card-1' }],
      endTurn: () => calls.push('endTurn'), play: () => (calls.push('play'), { ok: true }) },
    closeModal: () => calls.push('close'), render: () => calls.push('render'), toast: () => calls.push('toast'),
    ...state,
  };
  const event = { key: ' ', code: 'Space', repeat: false, defaultPrevented: false, isComposing: false,
    target: { isContentEditable: false, closest: () => null, matches: () => false },
    preventDefault: () => calls.push('preventDefault'), ...overrides };
  runInNewContext(`(${handler})`, context)(event);
  return calls;
}
test('body Space ends exactly one turn', () => assert.deepEqual(dispatch(), ['preventDefault', 'endTurn', 'render']));
test('body digit plays one card', () => assert.deepEqual(dispatch({ key: '1', code: 'Digit1' }), ['play', 'render']));
test('held shortcut does not repeat actions', () => {
  for (const e of [{ key: ' ', code: 'Space' }, { key: '1', code: 'Digit1' }])
    assert.deepEqual(dispatch({ ...e, repeat: true }), []);
});
test('interactive focus preserves native control behavior', () => {
  for (const tag of ['button', 'input', 'textarea', 'select', 'a[href]', '[role="button"]']) {
    const target = { isContentEditable: false,
      closest: selectors => selectors.split(',').includes(tag) ? {} : null,
      matches: selectors => selectors.split(',').includes(tag) };
    assert.deepEqual(dispatch({ target }), [], tag);
  }
});
test('editable content, composition and consumed events do not trigger combat', () => {
  for (const e of [{ target: { isContentEditable: true, closest: () => null, matches: () => false } },
    { isComposing: true }, { defaultPrevented: true }]) assert.deepEqual(dispatch(e), []);
});
test('Escape closes modal even with button focus', () => assert.deepEqual(dispatch({ key: 'Escape', code: 'Escape',
  target: { isContentEditable: false, closest: () => ({}), matches: () => false } }, { dialog: true }), ['close']));
test('modal and modifier shortcuts cannot change combat', () => {
  assert.deepEqual(dispatch({}, { dialog: true }), []);
  for (const key of ['ctrlKey', 'metaKey', 'altKey']) assert.deepEqual(dispatch({ [key]: true }), []);
});
