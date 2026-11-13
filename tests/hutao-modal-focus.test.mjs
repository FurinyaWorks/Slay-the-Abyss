import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
const dir = new URL('../experiments/characters/hutao/full75/', import.meta.url);
const source = readFileSync(new URL(readdirSync(dir).find(f => f.endsWith('.html')), dir), 'utf8');
const helpers = source.slice(source.indexOf('let modalReturnFocus='), source.indexOf('function deckList()'));
const renderer = source.slice(source.indexOf('function renderDialog()'), source.indexOf('function reset()'));
function harness() {
  const listeners = [];
  const doc = { activeElement: null, addEventListener(type, handler, capture) { if (type === 'keydown') listeners.push({ handler, capture }); }, querySelector: () => shell };
  const node = id => ({ id, isConnected: true, tabIndex: 0, disabled: false,
    getClientRects: () => [1], focus() { doc.activeElement = this; } });
  const trigger = node('libraryBtn'), close = node('closeDialog'), input = node('libSearch'), last = node('details');
  const shell = { inert: false };
  const root = { innerHTML: '', querySelectorAll: () => [close, input, last], contains: n => [close, input, last].includes(n) };
  const nodes = { libraryBtn: trigger, closeDialog: close, overlayRoot: root, guideBtn: node('guideBtn') };
  const ctx = { dialog: null, document: doc, el: id => nodes[id], CARDS: { test: { name: 'test' } }, html: x => x, dialogContents: () => '' };
  doc.activeElement = trigger;
  runInNewContext(helpers + renderer, ctx);
  function key(key, shiftKey = false, extra = {}) {
    const e = { key, shiftKey, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...extra };
    ctx.handleModalKeys(e); return e;
  }
  function dispatch(event) {
    for (const { handler } of listeners.slice().sort((a, b) => Number(!!b.capture) - Number(!!a.capture))) {
      handler(event); if (event.stopped) break;
    }
  }
  return { ctx, doc, shell, trigger, close, input, last, nodes, key, dispatch };
}
test('opening sets initial focus and makes background inert; closing restores both', () => {
  const h = harness(); h.ctx.openModal('library');
  assert.equal(h.doc.activeElement, h.close); assert.equal(h.shell.inert, true);
  h.ctx.closeModal(); assert.equal(h.doc.activeElement, h.trigger); assert.equal(h.shell.inert, false);
});
test('nested details preserves the original outside return target and inert state', () => {
  const h = harness(); h.ctx.openModal('library'); h.doc.activeElement = h.last;
  h.ctx.openModal('inspect:test'); h.ctx.closeModal(); assert.equal(h.doc.activeElement, h.trigger); assert.equal(h.shell.inert, false);
});
test('Tab and Shift+Tab wrap at the two boundaries', () => {
  const h = harness(); h.ctx.openModal('library');
  assert.equal(h.key('Tab', true).prevented, true); assert.equal(h.doc.activeElement, h.last);
  assert.equal(h.key('Tab').prevented, true); assert.equal(h.doc.activeElement, h.close);
  h.doc.activeElement = h.input; assert.equal(h.key('Tab').prevented, undefined);
});
test('hidden and disabled elements are excluded from focus loop', () => {
  const h = harness(); h.ctx.openModal('library'); h.last.disabled = true;
  h.input.getClientRects = () => []; h.key('Tab', true); assert.equal(h.doc.activeElement, h.close);
});
test('Escape from search closes and consumes event before combat handler', () => {
  const h = harness(); h.ctx.openModal('library'); h.doc.activeElement = h.input;
  const e = h.key('Escape'); assert.equal(e.prevented, true); assert.equal(e.stopped, true);
  assert.equal(h.ctx.dialog, null); assert.equal(h.doc.activeElement, h.trigger);
});
test('render-driven exit restores focus to replacement opener', () => {
  const h = harness(); h.ctx.openModal('library'); h.trigger.isConnected = false;
  const replacement = { focus() { h.doc.activeElement = this; } }; h.nodes.libraryBtn = replacement;
  h.ctx.dialog = null; h.ctx.renderDialog(); assert.equal(h.doc.activeElement, replacement); assert.equal(h.shell.inert, false);
});
test('prior inert state survives close and repeated open-close', () => {
  const h = harness(); h.shell.inert = true;
  for (let i = 0; i < 2; i++) { h.ctx.openModal('guide'); h.ctx.closeModal(); assert.equal(h.shell.inert, true); }
});
test('capture helper leaves nonmodal keys and composing events to existing handlers', () => {
  const h = harness(); assert.equal(h.key('Tab').prevented, undefined);
  h.ctx.openModal('library'); assert.equal(h.key('Escape', false, { isComposing: true }).prevented, undefined);
  assert.equal(h.key('1').prevented, undefined); assert.equal(h.ctx.dialog, 'library');
});

test('render-driven exit with an id-less opener returns to stable guide button', () => {
  const h = harness(); h.trigger.id = ''; h.ctx.openModal('upgrade'); h.trigger.isConnected = false;
  h.ctx.dialog = null; h.ctx.renderDialog(); assert.equal(h.doc.activeElement, h.nodes.guideBtn);
  assert.equal(h.shell.inert, false);
});

// Integrate capture-phase modal handling with the actual combat listener. Isolated
// handlers can pass while conflicting listener registration or propagation fails.
const combatRegistration = source.match(/^document\.addEventListener\('keydown',e=>.*\);$/m)?.[0];
assert.ok(combatRegistration);
test('combined listeners close a search modal without ending a turn, then allow one body shortcut', () => {
  const h = harness(); const actions = [];
  h.ctx.g = { phase: 'combat', hand: [], endTurn: () => actions.push('endTurn') };
  h.ctx.render = () => actions.push('render');
  runInNewContext(combatRegistration, h.ctx);
  h.ctx.openModal('library'); h.doc.activeElement = h.input;
  const makeEvent = (key, target = h.input) => ({ key, code: key === ' ' ? 'Space' : key,
    target, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; } });
  const esc = makeEvent('Escape'); h.dispatch(esc);
  assert.equal(esc.stopped, true); assert.equal(h.ctx.dialog, null);
  assert.equal(h.doc.activeElement, h.trigger); assert.deepEqual(actions, []);
  const body = { isContentEditable: false, closest: () => null };
  h.dispatch(makeEvent(' ', body)); assert.deepEqual(actions, ['endTurn', 'render']);
  h.dispatch({ ...makeEvent(' ', body), repeat: true }); assert.equal(actions.length, 2);
});
test('combined listeners trap Tab and block combat shortcuts while a modal is open', () => {
  const h = harness(); let turns = 0;
  h.ctx.g = { phase: 'combat', hand: [], endTurn: () => turns++ }; h.ctx.render = () => {};
  runInNewContext(combatRegistration, h.ctx); h.ctx.openModal('library');
  const event = { key: 'Tab', shiftKey: true, target: { closest: () => null },
    preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
  h.dispatch(event); assert.equal(h.doc.activeElement, h.last); assert.equal(event.defaultPrevented, true);
  h.dispatch({ key: ' ', code: 'Space', target: { closest: () => null } });
  assert.equal(turns, 0); assert.equal(h.ctx.dialog, 'library');
});
