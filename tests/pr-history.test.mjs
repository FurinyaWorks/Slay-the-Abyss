import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkHistory, auditHistory } from '../scripts/check-pr-history.mjs';
import { receiptToolingSource } from './helpers/integration-1111-tooling.mjs';

test('history receipt continuation authenticates complete source only in its official view', () => {
  const row = JSON.parse(readFileSync(new URL('./fixtures/pr-history-receipt-continuation.json', import.meta.url), 'utf8'));
  const source = readFileSync(row.path, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(source, row.after.source);
  for (const input of [source, source.replaceAll('\n', '\r\n')])
    assert.equal(receiptToolingSource(row.path, input, 'official'), row.before.source);
  for (const input of [source + '\n', source.slice(1), source.slice(0, -1), source.replace('checkHistory', 'changedHistory'), source.replaceAll('\n', '\r\r\n'), null, {}, 17])
    assert.equal(receiptToolingSource(row.path, input, 'official'), input);
  for (const view of ['curses', 'foreign', undefined])
    assert.equal(receiptToolingSource(row.path, source, view), source);
  for (const path of ['__proto__', 'constructor', 'foreign/' + row.path, row.path + '/extra'])
    assert.equal(receiptToolingSource(path, source, 'official'), source);
  assert.equal(receiptToolingSource(row.path, row.before.source, 'official'), row.before.source);
});

const sha = n => n.toString(16).padStart(40, '0');
const commit = n => ({ sha: sha(n), parents: [{ sha: sha(n - 1) }] });
const event = { pull_request: { base: { ref: 'develop', sha: sha(0), repo: { full_name: 'owner/repo' } }, head: { sha: sha(101) } } };
const comparison = commits => ({ total_commits: 101, base_commit: { sha: sha(0) }, commits });
const firstPage = () => comparison(Array.from({ length: 100 }, (_, i) => commit(i + 1)));

test('linear feature history remains valid and reports no merge commits', () => {
  assert.deepEqual(checkHistory([commit(1), commit(2)], 2, sha(2)), []);
});

test('base sync and coordinated integration merges are valid history, not a quality waiver', () => {
  for (const parents of [[1, 3], [1, 3, 4]]) {
    const merged = { ...commit(2), parents: parents.map(n => ({ sha: sha(n) })) };
    assert.deepEqual(checkHistory([commit(1), merged], 2, sha(2)), [sha(2)]);
  }
});

test('incomplete, duplicated, malformed and wrong-head history still fails closed', () => {
  for (const commits of [null, [], [commit(1)], [commit(2), commit(2)],
    [commit(1), null], [commit(1), { ...commit(2), sha: 'invalid' }],
    [commit(1), commit(3)]]) {
    assert.throws(() => checkHistory(commits, 2, sha(2)), /history/i);
  }
  for (const total of [0, -1, 1.5, '2', Number.NaN]) {
    assert.throws(() => checkHistory([commit(1), commit(2)], total, sha(2)), /history/i);
  }
});

test('missing, empty, invalid, repeated and self-parent identities are not accepted as merges', () => {
  for (const parents of [undefined, null, [], {}, [{}], [{ sha: 'invalid' }],
    [{ sha: sha(1) }, { sha: sha(1) }], [{ sha: sha(2) }]]) {
    assert.throws(() => checkHistory([commit(1), { ...commit(2), parents }], 2, sha(2)), /parent/i);
  }
});

test('immutable comparison paginates and reports a merge on the last page without rejecting it', async () => {
  const calls = [];
  let last = commit(101);
  const request = async path => {
    calls.push(path);
    return path.endsWith('page=1') ? firstPage() : comparison([last]);
  };
  const linear = await auditHistory(event, 'owner/repo', request);
  assert.equal(linear.status, 'linear');
  assert.deepEqual(linear.mergeCommits, []);
  assert.deepEqual(calls.map(path => path.slice(-6)), ['page=1', 'page=2']);
  assert.ok(calls.every(path => path.includes(`${sha(0)}...${sha(101)}`)));
  last = { ...last, parents: [{ sha: sha(100) }, { sha: sha(200) }] };
  const merged = await auditHistory(event, 'owner/repo', request);
  assert.deepEqual(merged, { status: 'nonlinear', base: sha(0), head: sha(101), commits: 101, mergeCommits: [sha(101)] });
});

test('history lookup failure on either page is never a successful audit', async () => {
  for (const failingPage of [1, 2]) {
    await assert.rejects(auditHistory(event, 'owner/repo', async path => {
      if (path.endsWith(`page=${failingPage}`)) throw new Error('offline');
      return firstPage();
    }), /offline/);
  }
});

test('comparison identity, page completeness and final head remain mandatory', async () => {
  const badPages = [
    { ...comparison([commit(101)]), total_commits: 102 },
    { ...comparison([commit(101)]), base_commit: { sha: sha(3) } },
    comparison([]), comparison([commit(100)]), comparison([commit(102)]),
    comparison([commit(101), commit(102)]), comparison(null),
  ];
  for (const page of badPages) {
    await assert.rejects(auditHistory(event, 'owner/repo', async path => path.endsWith('page=1') ? firstPage() : page));
  }
  await assert.rejects(auditHistory(event, 'wrong/repo', async () => firstPage()), /identity/);
  await assert.rejects(auditHistory(event, 'owner/repo', async () => ({ total_commits: 1, base_commit: { sha: sha(3) }, commits: [commit(101)] })), /base mismatch/);
  for (const page of [null, {}, { ...firstPage(), commits: null }, { ...firstPage(), total_commits: 0 }]) {
    await assert.rejects(auditHistory(event, 'owner/repo', async () => page));
  }
});

test('release policy stays separate and missing PR events cannot pass', async () => {
  assert.equal((await auditHistory({ pull_request: { base: { ref: 'master' } } }, '', () => assert.fail('release must not query feature history'))).status, 'release-policy');
  await assert.rejects(auditHistory({}, 'owner/repo', () => assert.fail('missing PR must not query history')), /pull_request/);
});

test('the existing required Quality checks history once before installing dependencies', () => {
  const workflow = readFileSync('.github/workflows/quality.yml', 'utf8');
  assert.equal(workflow.split('node scripts/check-pr-history.mjs').length - 1, 1);
  assert.match(workflow, /name: Check feature branch history\r?\n        if: github.event_name == 'pull_request'/);
  assert.ok(workflow.indexOf('run: node scripts/check-pr-history.mjs') < workflow.indexOf('- run: npm ci'));
});

test('real Git preserves multiple agent histories and conflict resolution while squash keeps develop linear', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pr-integration-'));
  const hooks = join(dir, 'empty-hooks');
  mkdirSync(hooks);
  const git = (...args) => execFileSync('git', ['-c', `core.hooksPath=${hooks}`, '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', ...args], {
    cwd: dir, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: join(dir, 'empty-config'), GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' },
  }).trim();
  const save = (file, text, message) => {
    writeFileSync(join(dir, file), text);
    git('add', file); git('commit', '-qm', message);
    return git('rev-parse', 'HEAD');
  };
  try {
    git('init', '-q', '-b', 'develop');
    git('config', 'user.name', 'Integration regression');
    git('config', 'user.email', 'integration-test@example.invalid');
    const base = save('shared.txt', 'base\n', 'base');
    git('checkout', '-qb', 'agent-a');
    const a = save('shared.txt', 'agent A\n', 'agent A');
    const newerA = save('later.txt', 'not in this batch\n', 'later agent A work');
    git('checkout', '-qb', 'agent-b', base);
    const b = save('shared.txt', 'agent B\n', 'agent B');
    git('checkout', '-qb', 'integration', base);
    git('merge', '--no-ff', '-m', 'include pinned A', a);
    assert.throws(() => git('merge', '--no-ff', '-m', 'include pinned B', b));
    assert.notEqual(git('ls-files', '-u'), '', 'the test must actually exercise a merge conflict');
    assert.equal(git('rev-parse', 'MERGE_HEAD'), b);
    save('shared.txt', 'agent A + agent B\n', 'resolve both contributions');
    git('checkout', '-q', 'develop');
    const latestBase = save('upstream.txt', 'landed upstream\n', 'advance develop');
    git('checkout', '-q', 'integration');
    git('merge', '--no-ff', '-m', 'sync landed develop without rewriting sources', latestBase);
    const head = git('rev-parse', 'HEAD');
    const tree = git('rev-parse', 'HEAD^{tree}');
    const commits = git('rev-list', '--reverse', '--topo-order', `${latestBase}..${head}`).split('\n').map(id => ({
      sha: id, parents: git('show', '-s', '--format=%P', id).split(' ').map(id => ({ sha: id })),
    }));
    assert.equal(checkHistory(commits, commits.length, head).length, 3);
    git('merge-base', '--is-ancestor', a, head);
    git('merge-base', '--is-ancestor', b, head);
    git('checkout', '-q', 'develop');
    git('merge', '--squash', head);
    git('commit', '-qm', 'squash integrated candidate');
    assert.equal(git('rev-parse', 'HEAD^{tree}'), tree, 'squash must preserve the resolved candidate tree');
    assert.equal(git('show', '-s', '--format=%P', 'HEAD'), latestBase);
    assert.equal(git('rev-list', '--merges', 'develop'), '');
    assert.equal(git('rev-parse', 'agent-a'), newerA);
    assert.equal(git('rev-parse', 'agent-b'), b);
    assert.equal(git('show', `${a}:shared.txt`), 'agent A');
    assert.equal(git('show', `${b}:shared.txt`), 'agent B');
    assert.equal(git('ls-tree', '--name-only', 'develop', '--', 'later.txt'), '');
    assert.equal(git('show', `${newerA}:later.txt`), 'not in this batch');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
