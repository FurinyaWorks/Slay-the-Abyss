import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {auditRepositoryNavigation, findRoutes} from '../tools/repo-navigation.mjs';

function sandbox(run) {
  const root = mkdtempSync(join(tmpdir(), 'repo-navigation-test-'));
  const put = (file, content = '') => {
    const target = join(root, file);
    mkdirSync(dirname(target), {recursive: true});
    writeFileSync(target, content);
  };
  try {
    put('AGENTS.md');
    put('docs/REPO_NAVIGATION.md');
    put('scripts/entry.mjs');
    put('src/lua/abyss_demo.lua');
    put('tests/demo.test.mjs');
    put('tests/lua/demo.lua');
    put('tests/helpers/support.mjs');
    put('tests/fixtures/seed.json');
    put('config/repo-navigation.json', JSON.stringify({schemaVersion: 1, routes: [
      {id: 'combat', description: 'battle rules', aliases: ['战斗'],
        files: ['src/lua/abyss_demo.lua', 'tests/demo.test.mjs']}
    ]}));
    run({root, put});
  } finally {rmSync(root, {recursive: true, force: true});}
}

test('routes have valid anchors and discoverable flat entry points', () => sandbox(({root, put}) => {
  put('tests/lua/helpers/fixture.lua');
  put('tests/lua/support/oracle.lua');
  put('tests/fixtures/history.lua');
  const report = auditRepositoryNavigation(root);
  assert.deepEqual(report.errors, []);
  assert.equal(report.counts['src/lua'], 1);
  assert.equal(findRoutes(report.routes, '战斗')[0].id, 'combat');
  assert.equal(findRoutes(report.routes, 'missing').length, 0);
}));

test('moving a Lua runtime module below first level is rejected', () => sandbox(({root, put}) => {
  put('src/lua/combat/abyss_hidden.lua');
  assert.match(auditRepositoryNavigation(root).errors.join('\n'), /Undiscoverable runtime Lua/);
}));

test('nested Node and Lua executable tests cannot silently evade CI', () => sandbox(({root, put}) => {
  put('tests/combat/hide.test.mjs');
  put('tests/lua/combat/hide.lua');
  const errors = auditRepositoryNavigation(root).errors.join('\n');
  assert.match(errors, /Undiscoverable Node test/);
  assert.match(errors, /Undiscoverable Lua test/);
}));

test('stale or escaping navigation anchors are rejected', () => sandbox(({root, put}) => {
  put('config/repo-navigation.json', JSON.stringify({schemaVersion: 1, routes: [
    {id: 'combat', description: 'battle rules', aliases: ['战斗'], files: ['../../outside.lua', 'src/lua/removed.lua']}
  ]}));
  const errors = auditRepositoryNavigation(root).errors.join('\n');
  assert.match(errors, /Unsafe\/duplicate anchor/);
  assert.match(errors, /Stale anchor/);
}));

test('actual repository navigation contract stays current', () => {
  const report = auditRepositoryNavigation();
  assert.deepEqual(report.errors, []);
  assert.ok(report.routes.length >= 10);
});
