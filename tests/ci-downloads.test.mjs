import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, truncateSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { beforeHostedCheckoutWorkflow, hostedCheckoutWorkflowEdits } from './helpers/hosted-checkout-workflow.mjs';
import { checkNetworkPolicy, checkHostedCheckout } from '../scripts/check-network-policy.mjs';

const workflow = readFileSync('.github/workflows/quality.yml', 'utf8');
test('every Fast and Full dependency installation retains bounded download retries', () => {
  const installs = [...workflow.matchAll(/npm ci[^\r\n]*/g)];
  assert.ok(installs.length >= 4);
  for (const install of installs) {
    const changed = workflow.slice(0, install.index) + install[0].replace('--fetch-retries=0', '--fetch-retries=99')
      + workflow.slice(install.index + install[0].length);
    assert.ok(checkNetworkPolicy(changed).some(message => message.includes('bounded retries')),
      `installation at ${install.index} must be checked`);
  }
});
const checkout = workflow.match(/      - name: Check out exact revision[^\n]*\r?\n[\s\S]*?        run: \|\r?\n([\s\S]*?)(?=\r?\n      - )/)[1].split(/\r?\n/).map(line => line.replace(/^          /, '')).join('\n');
function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
}
test('real workflow checkout keeps cross-branch deltas, bounded refs and exact revisions; negative controls retransfer', t => {
  const root = mkdtempSync(join(tmpdir(), 'abyss-ci-downloads-'));
  t.after(() => {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + (process.platform === 'win32' ? '\\' : '/')));
    assert.match(root, /abyss-ci-downloads-/); rmSync(root, { recursive: true, force: true });
  });
  const source = join(root, 'source'); mkdirSync(source); git(source, 'init');
  git(source, 'config', 'user.name', 'CI download test'); git(source, 'config', 'user.email', 'test@example.invalid');
  writeFileSync(join(source, 'base.txt'), 'base'); git(source, 'add', '.'); git(source, 'commit', '-m', 'base');
  const base = git(source, 'rev-parse', 'HEAD'), remote = pathToFileURL(source).href;
  function client(name) {
    const dir = join(root, name); mkdirSync(dir); git(dir, 'init');
    git(dir, 'config', 'gc.auto', '0'); git(dir, 'config', 'maintenance.auto', 'false');
    git(dir, 'fetch', '--no-tags', remote, base); git(dir, 'checkout', '--detach', 'FETCH_HEAD');
    git(dir, 'update-ref', 'refs/remotes/pull/4/merge', base); return dir;
  }
  const fixed = client('fixed'), broken = client('broken'), capped = client('capped');
  function run(dir, sha, script = checkout, ref = 'refs/pull/101/merge') {
    const file = join(root, 'checkout.ps1');
    // Only replace transport: execute the actual production PowerShell body offline.
    // Windows TEMP can be ADMINI~1; GitHub supplies a canonical workspace path.
    writeFileSync(file, 'Set-Location -LiteralPath $env:GITHUB_WORKSPACE\n$env:GITHUB_WORKSPACE = (Get-Location).Path\n' + script.replaceAll('https://github.com/$env:CI_REPOSITORY.git', remote));
    const r = spawnSync(process.platform === 'win32' ? 'powershell.exe' : 'pwsh', ['-NoProfile', '-File', file], {
      cwd: dir, encoding: 'utf8', windowsHide: true,
      env: { ...process.env, CI_TOKEN: 'offline-test-only', CI_SHA: sha, CI_REF: ref, CI_REPOSITORY: 'CHNISam/Slay-the-Abyss', GITHUB_WORKSPACE: dir, GITHUB_STEP_SUMMARY: join(root, 'summary.md') }
    });
    return { ...r, payload: Number(r.stdout?.match(/Checkout new Git pack payload: (\d+) bytes/)?.[1]) };
  }
  const twoSlots = checkout.replace('git update-ref --no-deref $checkoutRef refs/ci/current', '# No per-branch reference (regression)');
  const old = twoSlots.replace('git update-ref refs/ci/previous $previousHead', '# No advancing reference (regression)')
    .replace('"+${env:CI_SHA}:refs/ci/current"', '$env:CI_SHA').replace('git checkout --force --detach refs/ci/current', 'git checkout --force --detach FETCH_HEAD');
  writeFileSync(join(source, 'large.bin'), randomBytes(256 * 1024)); git(source, 'add', '.'); git(source, 'commit', '-m', 'large');
  let sha = git(source, 'rev-parse', 'HEAD');
  const first = run(fixed, sha); assert.equal(first.status, 0, first.stderr); assert.ok(first.payload > 250000);
  assert.equal(run(broken, sha, old).status, 0);
  const tooLarge = run(capped, sha, checkout.replace('$receivedPackBytes -gt 128MB', '$receivedPackBytes -gt 1KB'));
  assert.notEqual(tooLarge.status, 0); assert.match(tooLarge.stderr, /exceeded/);
  assert.equal(git(capped, 'rev-parse', 'HEAD'), base, 'over budget does not check out the fetched commit');
  assert.equal(git(capped, 'rev-parse', 'refs/ci/quality-tips/' + createHash('sha256').update('refs/pull/101/merge').digest('hex')), sha, 'successful over-budget download stays reachable');
  writeFileSync(join(source, 'tiny.txt'), 'tiny follow-up'); git(source, 'add', '.'); git(source, 'commit', '-m', 'tiny'); sha = git(source, 'rev-parse', 'HEAD');
  const next = run(fixed, sha); assert.equal(next.status, 0, next.stderr); assert.ok(next.payload < 8192, `new pack: ${next.payload}`);
  assert.equal(git(fixed, 'rev-parse', 'HEAD'), sha); assert.equal(git(fixed, 'rev-parse', 'refs/ci/current'), sha);
  git(fixed, 'diff', '--check', base, 'HEAD');
  const repeated = run(broken, sha, old); assert.equal(repeated.status, 0, repeated.stderr); assert.ok(repeated.payload > 250000, 'old workflow repeats the large object');
  const branchA = sha;
  const twoSlotClient = client('two-slots');
  assert.equal(run(twoSlotClient, branchA, twoSlots).status, 0);
  const tip = ref => 'refs/ci/quality-tips/' + createHash('sha256').update(ref).digest('hex');
  for (const [branch, ref] of [['B', 'refs/pull/102/merge'], ['C', 'refs/heads/feature-C']]) {
    git(source, 'checkout', '--detach', base);
    writeFileSync(join(source, `${branch}.bin`), randomBytes(64 * 1024));
    git(source, 'add', '.'); git(source, 'commit', '-m', branch);
    const otherSha = git(source, 'rev-parse', 'HEAD');
    for (const [dir, script] of [[fixed, checkout], [twoSlotClient, twoSlots]]) {
      const other = run(dir, otherSha, script, ref); assert.equal(other.status, 0, other.stderr);
    }
    git(source, 'checkout', '--detach', sha);
    writeFileSync(join(source, `after-${branch}.txt`), `return from ${branch}`);
    git(source, 'add', '.'); git(source, 'commit', '-m', `return from ${branch}`); sha = git(source, 'rev-parse', 'HEAD');
    const back = run(fixed, sha); assert.equal(back.status, 0, back.stderr);
    assert.ok(back.payload < 8192, `A after ${branch} retransferred ${back.payload} bytes`);
    assert.equal(git(fixed, 'rev-parse', 'HEAD'), sha);
    assert.equal(git(fixed, 'rev-parse', tip('refs/pull/101/merge')), sha);
    const replay = run(twoSlotClient, sha, twoSlots); assert.equal(replay.status, 0, replay.stderr);
    assert.ok(replay.payload > 250000, 'two global slots repeat A after another branch');
  }
  assert.equal(git(fixed, 'for-each-ref', '--format=%(refname)', 'refs/ci/quality-tips/').split('\n').length, 3, 'same ref advances without one ref per run');
  for (const invalid of ['', '--upload-pack=bad', 'refs/heads/a..b', 'refs/heads/a\nb', 'refs/pull/0/merge']) {
    const rejected = run(fixed, base, checkout, invalid);
    assert.notEqual(rejected.status, 0); assert.match(rejected.stderr, /Invalid checkout ref/);
    assert.equal(git(fixed, 'rev-parse', 'HEAD'), sha); assert.ok(Number.isNaN(rejected.payload), 'invalid identity fails before fetch');
  }
  for (const invalid of ['', '--upload-pack=bad', `${sha}\n`]) {
    const invalidSha = run(fixed, invalid);
    assert.notEqual(invalidSha.status, 0); assert.match(invalidSha.stderr, /Invalid checkout SHA/);
    assert.equal(git(fixed, 'rev-parse', 'HEAD'), sha); assert.ok(Number.isNaN(invalidSha.payload));
  }
  // This is a valid Git ref, but shell metacharacters must stay data, not code.
  const literalRef = 'refs/heads/$(throw).literal';
  const literal = run(fixed, sha, checkout, literalRef); assert.equal(literal.status, 0, literal.stderr);
  assert.equal(git(fixed, 'rev-parse', tip(literalRef)), sha);
  const protectedRefs = ['refs/ci/network-budget', 'refs/heads/user-keep', 'refs/heads/user-delete-keep', 'refs/ci/quality-tips/user-keep', 'refs/ci/quality-tips/user/nested'];
  for (const ref of protectedRefs) git(fixed, 'update-ref', ref, base);
  const activeTip = tip('refs/pull/101/merge'), staleTip = 'refs/ci/quality-tips/' + 'f'.repeat(64);
  git(fixed, 'update-ref', '--no-deref', '-d', activeTip);
  git(fixed, 'symbolic-ref', activeTip, 'refs/heads/user-keep');
  git(fixed, 'symbolic-ref', staleTip, 'refs/heads/user-delete-keep');
  for (let i = 0; i < 65; i++) git(fixed, 'update-ref', tip(`refs/heads/old-${i}`), base);
  const bounded = run(fixed, sha); assert.equal(bounded.status, 0, bounded.stderr);
  const retained = git(fixed, 'for-each-ref', '--format=%(refname)', 'refs/ci/quality-tips/').split('\n');
  assert.equal(retained.filter(ref => /^refs\/ci\/quality-tips\/[0-9a-f]{64}$/.test(ref)).length, 64);
  assert.ok(!retained.includes(staleTip), 'old cache symref is retired, not its user branch target');
  assert.equal(git(fixed, 'for-each-ref', '--format=%(symref)', activeTip), '', 'current cache symref becomes a direct tip');
  for (const ref of protectedRefs) assert.equal(git(fixed, 'rev-parse', ref), base);
  for (const ref of ['refs/ci/current', 'refs/ci/previous', tip('refs/pull/101/merge')]) assert.equal(git(fixed, 'rev-parse', ref), sha);
  const tipsBeforeFailure = git(fixed, 'for-each-ref', '--format=%(refname) %(objectname)', 'refs/ci/quality-tips/');
  const missing = run(fixed, '0'.repeat(40), checkout, 'refs/pull/404/merge');
  assert.notEqual(missing.status, 0); assert.match(missing.stderr, /Git fetch failed/);
  assert.equal(git(fixed, 'rev-parse', 'HEAD'), sha);
  assert.equal(git(fixed, 'for-each-ref', '--format=%(refname) %(objectname)', 'refs/ci/quality-tips/'), tipsBeforeFailure, 'failed fetch neither advances nor prunes branch tips');
  assert.match(readFileSync(join(root, 'summary.md'), 'utf8'), /Checkout new Git pack payload:/);
  console.log(`Git regression: first=${first.payload}B, follow-up=${next.payload}B, old-flow follow-up=${repeated.payload}B`);
});
test('lightweight engineering check catches old refs, removed size guard and unlimited dependency retry', () => {
  assert.deepEqual(checkNetworkPolicy(workflow), []);
  assert.ok(checkNetworkPolicy(workflow.replace('git update-ref refs/ci/previous', 'git remote remove origin')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('$receivedPackBytes -gt 128MB', '$receivedPackBytes -gt 999GB')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('--fetch-retries=0', '--fetch-retries=99')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('git update-ref --no-deref $checkoutRef refs/ci/current', '# removed stable tip')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('git check-ref-format $env:CI_REF', '# removed ref validation')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('$maxCheckoutTips = 64', '$maxCheckoutTips = 999999')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('git update-ref --no-deref $checkoutRef', 'git update-ref $checkoutRef')).length);
  assert.ok(checkNetworkPolicy(workflow.replace('git update-ref --no-deref -d $staleRef', 'git update-ref -d $staleRef')).length);
  assert.ok(checkNetworkPolicy(workflow.replace("$_ -cmatch '^refs/ci/quality-tips/[0-9a-f]{64}$' -and ", '')).length);
});

test('hosted checkout conditions, empty baseline, retained packs and execution order fail closed', () => {
  const changeStep = (name, mutate) => workflow.replace(new RegExp(`      - name: ${name}\\r?\\n[\\s\\S]*?(?=\\r?\\n      - |$)`), mutate);
  const hostedName = 'Check out exact revision on a fresh hosted VM';
  const guardName = 'Check hosted checkout Git pack payload';
  for (const name of [hostedName, guardName, 'Check out exact revision with installed Git']) {
    for (const condition of ['false', 'always()', "runner.environment == 'unknown'"]) {
      assert.ok(checkNetworkPolicy(changeStep(name, value => value.replace(/        if: [^\r\n]+/, `        if: ${condition}`))).length, `${name}: ${condition}`);
    }
    assert.ok(checkNetworkPolicy(changeStep(name, value => value.replace('        if:', '        continue-on-error: true\n        if:'))).length);
  }
  for (const token of ["GIT_CONFIG_COUNT: '1'", 'GIT_CONFIG_KEY_0: fetch.unpackLimit', "GIT_CONFIG_VALUE_0: '1'",
    'ref: ${{ github.sha }}', 'fetch-depth: 2', 'persist-credentials: false'])
    assert.ok(checkNetworkPolicy(changeStep(hostedName, value => value.replace(token, `# disabled ${token}`))).length, token);
  for (const replacement of ['', "          EXECUTION_ENVIRONMENT: self-hosted"])
    assert.ok(checkNetworkPolicy(workflow.replace('          EXECUTION_ENVIRONMENT: ${{ runner.environment }}', replacement)).length);
  assert.ok(checkNetworkPolicy(workflow.replace("          if ($env:EXECUTION_ENVIRONMENT -eq 'github-hosted'", "          # if ($env:EXECUTION_ENVIRONMENT -eq 'github-hosted'")).length);
  assert.ok(checkNetworkPolicy(changeStep(guardName, value => value.replace('run: node', 'run: echo node'))).length);
  assert.ok(checkNetworkPolicy(changeStep(guardName, () => '')).length);
  const guard = workflow.match(/      - name: Check hosted checkout Git pack payload\r?\n[\s\S]*?(?=\r?\n      - )/)[0];
  assert.ok(checkNetworkPolicy(workflow.replace(guard, '').replace(`      - name: ${hostedName}`, guard + '\n' + `      - name: ${hostedName}`)).length);
  assert.ok(checkNetworkPolicy(workflow + '\n').length === 0);
  assert.deepEqual(checkNetworkPolicy(workflow.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n')), []);
});

test('real fresh Git fetch retains pack payload and hosted CLI records exact revision without dependency installs', t => {
  const root = mkdtempSync(join(tmpdir(), 'abyss-hosted-downloads-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const source = join(root, 'source'), checkout = join(root, 'checkout');
  mkdirSync(source); mkdirSync(checkout);
  git(source, 'init'); git(source, 'config', 'user.name', 'Hosted checkout test'); git(source, 'config', 'user.email', 'test@example.invalid');
  writeFileSync(join(source, 'payload'), randomBytes(128 * 1024)); git(source, 'add', '.'); git(source, 'commit', '-m', 'payload');
  const sha = git(source, 'rev-parse', 'HEAD'); git(checkout, 'init');
  const fetched = spawnSync('git', ['fetch', '--depth=2', '--no-auto-maintenance', '--no-tags', pathToFileURL(source).href, sha], {
    cwd: checkout, encoding: 'utf8', env: {...process.env, GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'fetch.unpackLimit', GIT_CONFIG_VALUE_0: '1'}
  });
  assert.equal(fetched.status, 0, fetched.stderr); git(checkout, 'checkout', '--detach', 'FETCH_HEAD');
  const summary = join(root, 'summary.md'), log = [];
  const count = checkHostedCheckout({cwd: checkout, sha, summary, log: value => log.push(value)});
  assert.ok(count > 128 * 1024, `real retained pack ${count}`);
  assert.deepEqual(log, [`Hosted checkout Git pack payload: ${count} bytes`]);
  assert.equal(readFileSync(summary, 'utf8'), log[0] + '\n');
  const invoked = spawnSync(process.execPath, [resolve('scripts/check-network-policy.mjs'), '--hosted-checkout'], {
    cwd: checkout, encoding: 'utf8', env: {...process.env, GITHUB_SHA: sha, GITHUB_STEP_SUMMARY: summary}
  });
  assert.equal(invoked.status, 0, invoked.stderr); assert.equal(invoked.stdout, log[0] + '\n');
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), sha);
  assert.throws(() => checkHostedCheckout({cwd: checkout, sha: 'invalid', summary}), /Invalid hosted checkout SHA/);
  assert.throws(() => checkHostedCheckout({cwd: checkout, sha: '0'.repeat(40), summary}), /revision mismatch/);
  assert.throws(() => checkHostedCheckout({cwd: checkout, sha, summary: '', log: () => {}}), /summary destination/);
  assert.throws(() => checkHostedCheckout({cwd: checkout, sha, summary: root, log: () => {}}), /EISDIR|EPERM/);
  const extra = join(checkout, '.git/objects/pack/oversize.pack');
  for (const [total, warning, fail] of [[32 * 1024 ** 2, false, false], [32 * 1024 ** 2 + 1, true, false],
    [128 * 1024 ** 2, true, false], [128 * 1024 ** 2 + 1, false, true]]) {
    writeFileSync(extra, ''); truncateSync(extra, total - count); const messages = [];
    const check = () => checkHostedCheckout({cwd: checkout, sha, summary, log: message => messages.push(message)});
    if (fail) assert.throws(check, /exceeded 128 MiB/); else assert.equal(check(), total);
    assert.equal(messages[0], `Hosted checkout Git pack payload: ${total} bytes`);
    assert.equal(messages.some(message => message.startsWith('::warning::')), warning);
    assert.ok(readFileSync(summary, 'utf8').endsWith(messages[0] + '\n'), 'even rejected payload is retained in summary');
  }
  rmSync(extra); mkdirSync(extra);
  assert.throws(() => checkHostedCheckout({cwd: checkout, sha, summary}), /not a regular file/);
  rmSync(extra, {recursive: true});
  for (const name of readdirSync(join(checkout, '.git/objects/pack'))) rmSync(join(checkout, '.git/objects/pack', name));
  assert.throws(() => checkHostedCheckout({cwd: checkout, sha, summary}), /no retained Git pack/);
});

test('hosted workflow projection restores exact prior bytes and preserves partial, duplicate and unrelated drift', () => {
  // Exact quality.yml Git blob 6399aa1d from base 6a614fc8, not an updated oracle.
  const baseline = '28957431693a0c07dedcda5a1b8ffff031f94f93ca838203d65661343b46709d';
  const digest = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
  for (const eol of ['\n', '\r\n']) {
    const current = workflow.replaceAll('\r\n', '\n').replaceAll('\n', eol);
    const old = beforeHostedCheckoutWorkflow(current);
    assert.equal(digest(old), baseline);
    assert.equal(beforeHostedCheckoutWorkflow(old), old);
    assert.equal(old.replaceAll(eol, ''), old.replaceAll(/\r?\n/g, ''));
    const edits = hostedCheckoutWorkflowEdits.map(pair => pair.map(value => value.replaceAll('\n', eol)));
    for (let mask = 1; mask < 2 ** edits.length; mask++) {
      let partial = current;
      for (let i = 0; i < edits.length; i++) if (mask & 1 << i) partial = partial.replace(edits[i][1], edits[i][0]);
      assert.equal(beforeHostedCheckoutWorkflow(partial), partial);
    }
    for (const [, after] of edits) {
      const duplicate = current + after;
      assert.equal(beforeHostedCheckoutWorkflow(duplicate), duplicate);
      const altered = current.replace(after, after.replace(/\S/, '?'));
      assert.equal(beforeHostedCheckoutWorkflow(altered), altered);
    }
    for (const [from, to] of [['contents: read', 'contents: write'], ['fetch-depth: 2', 'fetch-depth: 3'],
      ["EXECUTION_ENVIRONMENT: ${{ runner.environment }}", 'EXECUTION_ENVIRONMENT: self-hosted']]) {
      const drift = current.replace(from, to), projected = beforeHostedCheckoutWorkflow(drift);
      assert.ok(projected.includes(to)); assert.notEqual(digest(projected), baseline);
    }
  }
});
