import { readFileSync, readdirSync, lstatSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Fresh hosted checkout only: this is compressed on-disk payload, not network
// traffic. The workflow proves an empty starting database and retains fetch packs.
export function checkHostedCheckout({cwd = process.cwd(), sha = process.env.GITHUB_SHA,
  summary = process.env.GITHUB_STEP_SUMMARY, log = console.log} = {}) {
  if (!/^[a-fA-F0-9]{40}$/.test(sha ?? '')) throw new Error('Invalid hosted checkout SHA');
  if (execFileSync('git', ['rev-parse', 'HEAD'], {cwd, encoding: 'utf8', timeout: 30000}).trim() !== sha)
    throw new Error('Hosted checkout revision mismatch');
  const directory = join(cwd, '.git/objects/pack');
  const packs = readdirSync(directory).filter(name => name.endsWith('.pack'));
  if (!packs.length) throw new Error('Hosted checkout has no retained Git pack');
  let bytes = 0;
  for (const name of packs) {
    const file = lstatSync(join(directory, name));
    if (!file.isFile()) throw new Error('Hosted Git pack is not a regular file');
    bytes += file.size;
  }
  if (!Number.isSafeInteger(bytes)) throw new Error('Hosted Git pack size is not a safe integer');
  const message = `Hosted checkout Git pack payload: ${bytes} bytes`;
  log(message);
  if (!summary) throw new Error('Hosted checkout summary destination is missing');
  appendFileSync(summary, message + '\n');
  if (bytes > 128 * 1024 ** 2) throw new Error('Hosted checkout exceeded 128 MiB; investigate before retrying');
  if (bytes > 32 * 1024 ** 2) log('::warning::Hosted checkout received over 32 MiB; check whether this is an expected first download');
  return bytes;
}

export function checkNetworkPolicy(text) {
  const check = (text + '\n  end-of-workflow:\n').match(/\n  rules:\r?\n([\s\S]*?)(?=\r?\n  [\w-]+:)/)?.[1];
  if (!check) return ['Quality/rules missing'];
  const errors = [];
  const steps = check.split(/\r?\n(?=      - )/);
  const step = name => {
    const matches = steps.filter(value => value.startsWith(`      - name: ${name}\n`) || value.startsWith(`      - name: ${name}\r\n`));
    if (matches.length !== 1) { errors.push(`Missing or duplicate checkout step: ${name}`); return ''; }
    return matches[0];
  };
  const preparation = step('Record execution environment and check free workspace space');
  const hosted = step('Check out exact revision on a fresh hosted VM');
  const local = step('Check out exact revision with installed Git');
  const guard = step('Check hosted checkout Git pack payload');
  const condition = (value, expected) => {
    const conditions = [...value.matchAll(/^        if: (.*)\r?$/gm)];
    return conditions.length === 1 && conditions[0][1].trim() === expected;
  };
  if (!condition(hosted, "runner.environment == 'github-hosted'") || !condition(guard, "runner.environment == 'github-hosted'"))
    errors.push('Hosted checkout and pack guard must share the reachable hosted condition');
  if (!condition(local, "runner.environment == 'self-hosted'")) errors.push('Local checkout must use the reachable self-hosted condition');
  if (/^        if:/m.test(preparation) || [preparation, hosted, local, guard].some(value => /^        continue-on-error:/m.test(value)))
    errors.push('Checkout safeguards must not be conditional or continue on error');
  if (!preparation.split(/\r?\n/).includes('          EXECUTION_ENVIRONMENT: ${{ runner.environment }}'))
    errors.push('Hosted empty-database guard must bind the real runner environment');
  if (!preparation.includes("          if ($env:EXECUTION_ENVIRONMENT -eq 'github-hosted' -and (Test-Path -LiteralPath '.git')) { throw 'Hosted checkout must start without a Git database' }"))
    errors.push('Hosted checkout must prove an empty starting Git database');
  for (const required of ["          GIT_CONFIG_COUNT: '1'", '          GIT_CONFIG_KEY_0: fetch.unpackLimit', "          GIT_CONFIG_VALUE_0: '1'",
    '          ref: ${{ github.sha }}', '          fetch-depth: 2', '          persist-credentials: false'])
    if (!hosted.split(/\r?\n/).includes(required)) errors.push(`Missing hosted checkout safeguard: ${required.trim()}`);
  if (!/^        run: node scripts\/check-network-policy\.mjs --hosted-checkout\r?$/m.test(guard))
    errors.push('Hosted checkout must execute the pack guard');
  if (!(steps.indexOf(preparation) < steps.indexOf(hosted) && steps.indexOf(hosted) < steps.indexOf(local)
    && steps.indexOf(local) < steps.indexOf(guard) && steps.indexOf(guard) < steps.findIndex(value => value.includes('uses: actions/setup-node@'))))
    errors.push('Hosted pack guard must follow checkout and precede dependency setup');
  if (/git remote remove origin|actions\/cache(?:@|\/)/.test(check)) errors.push('Local CI must preserve Git refs and avoid remote dependency cache downloads');
  for (const required of ['git update-ref refs/ci/previous', '+${env:CI_SHA}:refs/ci/current', '--no-auto-maintenance', 'git checkout --force --detach refs/ci/current', '$receivedPackBytes -gt 128MB', '$env:GITHUB_STEP_SUMMARY', 'npm run check:network']) if (!(required === 'npm run check:network' ? check : local).includes(required)) errors.push(`Missing CI download safeguard: ${required}`);
  for (const required of ['CI_REF: ${{ github.ref }}', 'git check-ref-format $env:CI_REF', "'\\A[0-9a-fA-F]{40}\\z'", "'^refs/((heads|tags)/.+|pull/[1-9][0-9]*/merge)$'", "'refs/ci/quality-tips/'", '[Security.Cryptography.SHA256]::Create()', 'git update-ref --no-deref $checkoutRef refs/ci/current', '$maxCheckoutTips = 64', "--format='%(refname)' refs/ci/quality-tips/", "Where-Object { $_ -cmatch '^refs/ci/quality-tips/[0-9a-f]{64}$' -and $_ -cne $checkoutRef }", 'Select-Object -Skip ($maxCheckoutTips - 1)', 'git update-ref --no-deref -d $staleRef']) if (!local.includes(required)) errors.push(`Missing bounded per-branch checkout safeguard: ${required}`);
  // Fast planning/execution also installs dependencies. Apply the same bounded
  // download contract to every job, rather than only the original rules job.
  const installs = text.match(/npm ci[^\r\n]*/g) || [];
  if (!installs.length || installs.some(line => ['--prefer-offline', '--no-audit', '--fetch-retries=0', '--fetch-timeout=30000'].some(flag => !line.includes(flag)))) errors.push('npm CI downloads must prefer cache and use bounded retries/timeouts');
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv[2] === '--hosted-checkout') {
    try { checkHostedCheckout(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  } else {
  const errors = checkNetworkPolicy(readFileSync(new URL('../.github/workflows/quality.yml', import.meta.url), 'utf8'));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('CI download safeguards verified: reachable hosted/local Git pack guards, incremental refs, bounded npm retries');
  }
}
