import test from 'node:test';
import assert from 'node:assert/strict';
import { relicViewControls } from '../scripts/relic-view-layout.mjs';
import { nativeTheme as theme } from '../scripts/native-ui-theme.mjs';
import { mapGeometry } from '../scripts/map-ui-layout.mjs';
import { gameLayout } from '../scripts/game-ui-layout.mjs';
import { applyOfficialAssets, officialAssetsTheme } from '../scripts/official-assets-layout.mjs';

const frame = c => [...(c.position ?? [0, 0]), ...c.size];
const clear = (a, b) => Math.abs(a[0] - b[0]) >= (a[2] + b[2]) / 2 ||
  Math.abs(a[1] - b[1]) >= (a[3] + b[3]) / 2;
test('official relic surfaces reuse the battle information-window material and preserve controls',()=>{
  const layout=gameLayout(),t=officialAssetsTheme(theme),parts=n=>n.controls??n.children??[],child=(n,k)=>parts(n).find(c=>c.name===k);
  const panel=child(layout,'relicPanel'),bar=child(layout,'relicBar');
  const rows=parts(panel).filter(n=>/^row\d+$/.test(n.name)),live=[panel,...rows,...['blocker','contentBlocker','single','close','next','previous'].map(k=>child(panel,k))];
  const before=live.map(n=>JSON.stringify([n.position,n.size]));
  applyOfficialAssets([layout],t);
  live.forEach((n,i)=>assert.equal(JSON.stringify([n.position,n.size]),before[i]));
  for(const host of [panel,...rows]){
    const border=child(host,host===panel?'frame':'border'),plate=child(host,'plate');
    assert.equal(border.image,t.image.rect);assert.equal(border.colour,t.color.goldDim);
    assert.equal(plate.image,t.image.rect);assert.equal(plate.colour,t.color.panelSunken);
  }
  const style=t.officialAssets.battleRelicBar;
  for(let i=1;i<=style.count;i++){
    const slot=child(bar,'slot'+i);assert.deepEqual(slot.position,[style.origin[0]+style.step*(i-1),style.origin[1]]);
    assert.deepEqual(child(slot,'icon').size,[style.icon,style.icon]);assert.deepEqual(child(slot,'hit').size,[style.hit,style.hit]);
    assert.equal(child(slot,'rim').visible,false);assert.equal(child(slot,'face').visible,false);
  }
});
function assertBarGeometry(t) {
  const [bar] = relicViewControls(t), [tray, ...slots] = bar.children;
  const obstacles = Object.values(t.layout.nativeNode.topBar);
  // Final battle controls use a different top-row height from node/map HUDs.
  const battle = gameLayout(t).controls.find(c => c.name === 'battlePanel');
  obstacles.push(...battle.children.filter(c => c.position?.[1] >= 300).map(frame));
  for (const key of ['relicEntry', 'entry']) obstacles.push(t.layout.deckView[key]);
  const frames = [frame(tray)];
  for (const slot of slots) {
    frames.push(frame(slot));
    const hit = slot.children.find(c => c.name === 'hit');
    assert.equal(hit.kind, 'cursorArea'); assert.equal(hit.focusable, true);
    assert.deepEqual(hit.size, [t.layout.relicView.bar.step, 44]);
    const [x, y] = hit.position ?? [0, 0];
    assert.ok(Math.abs(x) + slot.size[0] / 2 <= hit.size[0] / 2 &&
      Math.abs(y) + slot.size[1] / 2 <= hit.size[1] / 2, 'hit covers the entire relic disc');
    frames.push([slot.position[0] + x, slot.position[1] + y, ...hit.size]);
  }
  for (const f of frames) {
    assert.ok(Math.abs(f[0]) + f[2] / 2 <= t.canvas.base[0] / 2 &&
      Math.abs(f[1]) + f[3] / 2 <= t.canvas.base[1] / 2, 'relic visual/hit stays on canvas');
    for (const obstacle of obstacles) assert.ok(clear(f, obstacle), 'relic visual/hit clears main HUD in 2D');
  }
  for (let i = 1; i < slots.length; i++) {
    const a = frames[2 * i], b = frames[2 * (i + 1)];
    assert.ok(clear(a, b), 'adjacent relic hit areas never overlap');
  }
}

test('owned relics use disc art slots in the top bar and detail rows', () => {
  const [bar, panel] = relicViewControls(theme), v = theme.layout.relicView;
  assert.equal(bar.name, 'relicBar');
  const [tray, ...slots] = bar.children;
  assert.equal(tray.name, 'tray');
  assert.equal(slots.length, v.bar.count);
  // Relics now occupy a second row; preserve separation in both axes, not X alone.
  assert.equal(slots.length, 12);
  assertBarGeometry(theme);
  slots.forEach((slot, i) => {
    assert.ok(Math.abs(slot.position[0] - v.bar.tray[0]) + v.bar.disc / 2 <= v.bar.tray[2] / 2, 'disc inside tray');
    assert.deepEqual(slot.position, [v.bar.origin[0] + v.bar.step * i, v.bar.origin[1]]);
    assert.deepEqual(slot.size, [v.bar.disc, v.bar.disc]);
    assert.deepEqual(slot.children.map(c => c.name), ['rim', 'face', 'icon', 'counter', 'more', 'hit']);
    assert.equal(slot.children.find(c => c.name === 'counter').visible, false);
    assert.equal(slot.children[0].image, theme.image.disc);
    assert.ok(Math.abs(slot.position[1] - v.bar.tray[1]) + v.bar.disc / 2 <= v.bar.tray[3] / 2, 'disc vertically inside tray');
    if (i) assert.ok(slot.position[0] - slots[i - 1].position[0] >= v.bar.disc, 'discs never overlap');
  });
  const rows = panel.children.filter(c => /^row\d+$/.test(c.name));
  assert.equal(rows.length, v.rows.length * v.columns.length);
  for (const row of rows) {
    const names = row.children.map(c => c.name);
    for (const n of ['slot', 'name', 'chip', 'description']) assert.ok(names.includes(n), n);
    const slot = row.children.find(c => c.name === 'slot');
    assert.deepEqual(slot.size, [v.disc, v.disc]);
    assert.ok(slot.position[0] + v.disc / 2 < v.name[0] - v.name[2] / 2, 'name clears the art disc');
    assert.ok(Math.abs(row.position[0]) + v.row[0] / 2 <= v.panel[2] / 2);
  }
  assert.equal(panel.isolateNavigation, true);
  const json = JSON.stringify(panel);
  assert.doesNotMatch(json.replace(/"(name|kind|image|align|valign|colour)":"[^"]*"/g, ''), /"content":"[A-Za-z]{3,}/);
});

test('single relic content stays above its input shield and preserves original icon colors', () => {
  const [bar, panel] = relicViewControls({...theme, presentationProfile: 'official-assets-first'});
  const names = panel.children.map(c => c.name);
  assert.ok(names.indexOf('blocker') < names.indexOf('contentBlocker'));
  assert.ok(names.indexOf('contentBlocker') < names.indexOf('single'));
  assert.ok(names.indexOf('single') < names.indexOf('close'));
  const single = panel.children.find(c => c.name === 'single');
  assert.equal(single.visible, false);
  for (const name of ['icon', 'name', 'rarity', 'description', 'status']) assert.ok(single.children.some(c => c.name === name));
  assert.equal(single.children.find(c => c.name === 'icon').colour, '#FFFFFF');
  const legacyPanel = relicViewControls(theme)[1];
  const legacySingle = legacyPanel.children.find(c => c.name === 'single');
  for (const name of ['rarity', 'status']) {
    const label = legacySingle.children.find(c => c.name === name);
    assert.ok(label.text.fontSize * 1.45 + 4 <= label.size[1], `${name} fits one line before the official pass`);
  }
  assert.equal(bar.children[1].children.find(c => c.name === 'icon').colour, '#FFFFFF');
  const legacy = structuredClone(theme); delete legacy.officialAssets;
  const [legacyBar] = relicViewControls(legacy);
  assert.equal(legacyBar.children[1].children.find(c => c.name === 'icon').colour, legacy.color.mapHeader.menuNormal.ink);
});

test('production default layout then official pass preserves relic icon colors without changing semantic IDs', () => {
  // buildUI constructs gameLayout(undefined, options) before the official pass.
  const layout = gameLayout();
  const stage = layout.controls.find(c => c.name === 'stage') ?? layout;
  const children = c => c.children ?? c.controls ?? [];
  const child = (c, name) => children(c).find(n => n.name === name);
  const bar = child(stage, 'relicBar'), panel = child(stage, 'relicPanel');
  const icons = [child(child(bar, 'slot1'), 'icon'), child(child(child(panel, 'row1'), 'slot'), 'icon'), child(child(panel, 'single'), 'icon')];
  const ids = icons.map(c => c.image);
  assert.equal(icons[0].colour, theme.color.mapHeader.menuNormal.ink, 'legacy construction retains the old HUD palette');
  applyOfficialAssets([layout], officialAssetsTheme(theme));
  assert.deepEqual(icons.map(c => c.image), ids, 'official pass must retain the semantic icon source');
  assert.deepEqual(icons.map(c => c.colour), ['#FFFFFF', '#FFFFFF', '#FFFFFF']);
});

test('second-row geometry rejects the old overlapping row and off-canvas click areas', () => {
  const old = structuredClone(theme);
  old.layout.relicView.bar.origin[1] = old.layout.relicView.bar.tray[1] = 282;
  assert.throws(() => assertBarGeometry(old), /clears main HUD/);
  const wide = structuredClone(theme); wide.layout.relicView.bar.origin[0] = -640;
  assert.throws(() => assertBarGeometry(wide), /stays on canvas/);
});

test('map drawings and input viewport reserve the second-row relic hit band', () => {
  const g = mapGeometry(theme), [bar] = relicViewControls(theme);
  for (const slot of bar.children.slice(1)) {
    const hit = slot.children.find(c => c.name === 'hit');
    assert.ok(g.viewport.top <= slot.position[1] - hit.size[1] / 2, 'map must end below relic click areas');
  }
  assert.equal(g.maxScroll, g.contentHeight - (g.viewport.top - g.viewport.bottom));
});

test('real map nodes and focus never share second-row relic click areas', async () => {
  const { buildLuaData } = await import('../scripts/build-lua-data.mjs');
  const { buildUI } = await import('../scripts/build-ui.mjs');
  const { runLua } = await import('../scripts/test-lua.mjs');
  buildLuaData(); buildUI();
  const r = runLua('tests/lua/relic_map_clearance.lua');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /RELIC_MAP_CLEARANCE_PASS/);
});
