import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'experiments/figma-map-native-spike');
const require = createRequire(import.meta.url);

function childEnvironment(parent = process.env) {
  const env = { ...parent, ABYSS_ROOT: root, FIGMA_SCENARIO: 'real-wins',
    LUA_INIT: '', LUA_INIT_5_3: '', LUA_PATH: './?.lua;;', LUA_PATH_5_3: './?.lua;;' };
  // This is an independent test CLI, not another child of the outer runner.
  delete env.NODE_TEST_CONTEXT;
  return env;
}
function assertStageResult(phase, result, elapsedMs) {
  const details = `${phase}: ${elapsedMs.toFixed(3)}ms\n${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.error) throw new Error(`${result.error.message}\n${details}`, { cause: result.error });
  assert.equal(result.signal, null, `${phase} terminated\n${details}`);
  assert.equal(result.status, 0, details);
  return details;
}
function assertNestedTests(output) {
  assert.match(output, /^# tests [1-9]\d*$/m, 'nested JavaScript tests must actually execute');
  for (const count of ['fail', 'cancelled', 'skipped', 'todo']) {
    assert.match(output, new RegExp(`^# ${count} 0$`, 'm'), `nested JavaScript ${count} must be zero`);
  }
}

// Discovered by npm test / the existing tests/*.test.mjs CI sharder.
// Build prerequisites are the normal build:data + build:ui; no Host or network.
test('native Figma map slice keeps platform, input and generated-layout regressions', () => {
  const work = mkdtempSync(join(tmpdir(), 'abyss-figma-map-regression-'));
  const run = (phase, args) => {
    const started = performance.now();
    const result = spawnSync(process.execPath, args, {
      cwd: work,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 4 * 1024 * 1024,
      env: childEnvironment(),
    });
    console.log(assertStageResult(phase, result, performance.now() - started));
    return result.stdout;
  };
  try {
    // Copy only reproducible source. Never read or trust checked-out generated saves.
    for (const name of readdirSync(source)) {
      if (/\.(?:mjs|lua)$/.test(name) && !/\.generated\.lua$/.test(name)
          && !['controls.lua', 'theme.lua', 'geometry.lua'].includes(name)) {
        cpSync(join(source, name), join(work, name));
      }
    }
    cpSync(join(source, 'tests'), join(work, 'tests'), { recursive: true });
    cpSync(join(source, 'tools'), join(work, 'tools'), { recursive: true });
    run('build-probe', ['build-probe.mjs']);
    run('build-scene', ['build-scene.mjs']);
    const jsTests = readdirSync(join(work, 'tests')).filter(name => name.endsWith('.test.mjs')).sort();
    assert.ok(jsTests.length >= 3, 'layout, probe and pointer regression files required');
    const jsOutput = run('javascript-regressions', ['--test', '--test-reporter=tap', '--test-concurrency=1', ...jsTests.map(name => join('tests', name))]);
    assertNestedTests(jsOutput);
    // -e, not positional script: upstream Fengari otherwise loses assertion exit status.
    const cli = require.resolve('fengari-node-cli/src/lua-cli.js');
    run('lua-regressions', [cli, '-e', 'for _,path in ipairs({"tests/curve.lua","tests/presentation.lua","tests/scene.lua"}) do print("FIGMA_STAGE_START "..path.." cpuSeconds="..os.clock()); dofile(path); print("FIGMA_STAGE_END "..path.." cpuSeconds="..os.clock()) end']);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('native map child CLI removes both inherited test-context forms without mutating its parent', () => {
  for (const marker of ['child-v8', '']) {
    const parent = { NODE_TEST_CONTEXT: marker, KEEP_ME: 'kept', LUA_INIT: 'unsafe', LUA_PATH: 'unsafe' };
    const env = childEnvironment(parent);
    assert.ok(!Object.hasOwn(env, 'NODE_TEST_CONTEXT'));
    assert.equal(parent.NODE_TEST_CONTEXT, marker);
    assert.equal(env.KEEP_ME, 'kept');
    assert.equal(env.ABYSS_ROOT, root);
    assert.equal(env.FIGMA_SCENARIO, 'real-wins');
    for (const key of ['LUA_INIT', 'LUA_INIT_5_3']) assert.equal(env[key], '');
    for (const key of ['LUA_PATH', 'LUA_PATH_5_3']) assert.equal(env[key], './?.lua;;');
  }
});

test('native map stage failures retain phase, timing and both captured output streams', () => {
  const output = { stdout: 'before-timeout', stderr: 'last-diagnostic', status: 0, signal: null };
  const error = Object.assign(new Error('spawn ETIMEDOUT'), { code: 'ETIMEDOUT' });
  for (const extra of [{ error }, { status: 1 }, { signal: 'SIGTERM' }]) {
    assert.throws(() => assertStageResult('lua-regressions', { ...output, ...extra }, 30001.25), failure => {
      for (const detail of ['lua-regressions', '30001.250ms', output.stdout, output.stderr]) {
        assert.ok(failure.message.includes(detail), detail);
      }
      if (extra.error) assert.equal(failure.cause, error);
      return true;
    });
  }
  assert.match(assertStageResult('build-scene', output, 1), /build-scene: 1.000ms/);
});

test('native map nested CLI refuses empty, skipped or incomplete regression evidence', () => {
  const passed = '# tests 16\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
  assert.doesNotThrow(() => assertNestedTests(passed));
  for (const output of ['', passed.replace('# tests 16', '# tests 0'),
    ...['fail', 'cancelled', 'skipped', 'todo'].map(field => passed.replace(`# ${field} 0`, `# ${field} 1`)),
    passed.replace('# skipped 0\n', '')]) assert.throws(() => assertNestedTests(output));
});
