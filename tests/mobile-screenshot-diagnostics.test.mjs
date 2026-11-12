import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { exitControls } from '../scripts/exit-ui-layout.mjs';
import { nativeTheme } from '../scripts/native-ui-theme.mjs';

const require = createRequire(import.meta.url);
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = require('fengari');

test('screenshot report uses ten bounded native rows and a pause-menu entry', () => {
  const nodes = exitControls(nativeTheme);
  const report = nodes.find(node => node.name === 'diagnosticsPanel');
  const menu = nodes.find(node => node.name === 'runMenu');
  assert(report && menu);
  assert.equal(report.visible, false);
  assert.equal(report.children.filter(node => /^line\d+$/.test(node.name)).length, 10);
  assert(menu.children.some(node => node.name === 'diagnostics'));
  assert(report.children.some(node => node.name === 'close'));
  for (const name of ['blocker', 'catch']) assert(report.children.some(node => node.name === name));
  assert(!JSON.stringify(report).includes('clipboard'));
});

test('real Lua snapshot is read-only, bounded and safe without viewport APIs', () => {
  const source = readFileSync('src/lua/abyss_diagnostic_report.lua', 'utf8');
  const code = [
    "local Report=assert(load(ENTRY))()",
    "local report=Report.new('v-test-1')",
    "local run={phase='combat',character='traveler',act=1,hp=49,maxHp=80,gold=22,combat={turn=3,hand={{},{},{}},enemies={{},{}}}}",
    "local ui={run=run,map={floor=5},mode='battle',runSeed=24157,battleUI={selected=17,target=2,gesture={}}}",
    "assert(report:observe('menu',nil))",
    "assert(report:observe('map',{phase='map'}))",
    "assert(report:observe('battle',run))",
    "assert(not report:observe('battle',run))",
    "assert(report:observe('battle',{phase='reward'}))",
    "assert(#report.recent==3 and report.recent[1]=='map/map')",
    "local rows={}",
    "local panel={}",
    "function panel:GetChild(k) rows[k]=rows[k] or {};return rows[k] end",
    "report:render(panel,ui,{touchScreen=function()return true end,getViewport=function()return 1280,720 end})",
    "assert(rows.line1.text=='版本: v-test-1')",
    "assert(rows.line2.text:find('mobile') and rows.line2.text:find('1280x720'))",
    "assert(rows.line4.text:find('24157'))",
    "assert(rows.line7.text:find('手牌 3') and rows.line7.text:find('敌人 2'))",
    "assert(rows.line8.text:find('选牌 17') and rows.line8.text:find('active'))",
    "assert(rows.line9.text:find('map/map') and not rows.line9.text:find('menu/'))",
    "assert(run.hp==49 and run.combat.turn==3 and #run.combat.hand==3)",
    "report:render(panel,ui,{touchScreen=function()error('unavailable')end})",
    "assert(rows.line2.text:find('unknown') and rows.line2.text:find('画布: %-'))"
  ].join('\n');
  const L = lauxlib.luaL_newstate();
  try {
    lualib.luaL_openlibs(L);
    const result = lauxlib.luaL_dostring(L, to_luastring('ENTRY=' + JSON.stringify(source) + '\n' + code));
    assert.equal(result, lua.LUA_OK, result === lua.LUA_OK ? '' : to_jsstring(lua.lua_tostring(L, -1)));
  } finally {
    lua.lua_close(L);
  }
});

test('diagnostics stay behind the existing input guard and never claim FPS', () => {
  const input = readFileSync('src/lua/abyss_game_ui_input.lua', 'utf8');
  const host = readFileSync('src/lua/abyss_game_ui.lua', 'utf8');
  const view = readFileSync('src/lua/abyss_game_ui_view.lua', 'utf8');
  const reporter = readFileSync('src/lua/abyss_diagnostic_report.lua', 'utf8');
  assert.match(input, /'run_diagnostics'/);
  assert.match(input, /'diagnosticsClose'/);
  assert.match(input, /not self\.diagnosticsOpen/);
  assert.match(view, /diagnostics:SetAsLastSibling/);
  assert.match(host, /self\.diagnostics:render/);
  assert.doesNotMatch(reporter, /GetFPS|GetMemory|clipboard|io\.|ServerSignal|OnUpdate/);
});
