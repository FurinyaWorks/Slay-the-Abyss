// Manual, offline campaign sampling. Reuses M3's real rules and autoplay policy;
// no independent combat simulator or changed HP/decks/RNG.
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_SEEDS = 200;
const PER_PROCESS = 20; // Existing m3-normal-campaign.mjs limit.

export function seedBatches(start, count) {
  if (![start, count].every(Number.isSafeInteger) || start < 0 || count < 1 || count > MAX_SEEDS || start + count - 1 > 2147483647) {
    throw new Error(`Expected start >= 0 and 1..${MAX_SEEDS} seeds (32-bit bounded)`);
  }
  const out = [];
  for (let offset = 0; offset < count; offset += PER_PROCESS) {
    out.push(Array.from({ length: Math.min(PER_PROCESS, count - offset) }, (_, i) => start + offset + i));
  }
  return out;
}

export function summarizeEvidence(evidence) {
  if (!evidence || !Number.isSafeInteger(evidence.seed) || !Array.isArray(evidence.actions)
    || !Number.isSafeInteger(evidence.final?.floor) || evidence.final.floor < 0 || !Number.isFinite(evidence.final?.hp)
    || evidence.platformVerified !== false || evidence.newRunConstructionResetVerified !== true) {
    throw new Error('Missing or untrusted M3 offline evidence');
  }
  const status = evidence.status;
  if (!['victory', 'defeat', 'driver_blocked'].includes(status)) throw new Error(`Unexpected campaign status: ${status}`);
  let hpLost = 0, healed = 0, played = 0, cardPicks = 0;
  for (const action of evidence.actions) {
    if (!action || typeof action.label !== 'string' || typeof action.ok !== 'boolean'
      || !Number.isFinite(action.before?.hp) || !Number.isFinite(action.after?.hp)
      || action.label === 'card_reward' && (!Number.isSafeInteger(action.details?.index) || action.details.index < 0)) {
      throw new Error('Missing or untrusted M3 action metrics');
    }
    if (action.label === 'play') played++;
    if (action.label === 'card_reward' && action.ok && action.details.index > 0) cardPicks++;
    if (action.before && action.after && Number.isFinite(action.before.hp) && Number.isFinite(action.after.hp)) {
      hpLost += Math.max(0, action.before.hp - action.after.hp);
      healed += Math.max(0, action.after.hp - action.before.hp);
    }
  }
  return { seed: evidence.seed, status, floor: evidence.final.floor, hp: evidence.final.hp,
    rooms: evidence.rooms?.length ?? 0, actions: evidence.actions.length,
    played, cardPicks, hpLost, healed, reason: status === 'driver_blocked' ? evidence.reason : null };
}

export function aggregateRows(rows) {
  if (!Array.isArray(rows) || !rows.length || new Set(rows.map(r => r.seed)).size !== rows.length) {
    throw new Error('No evidence rows, or duplicate seeds');
  }
  const victory = rows.filter(x => x.status === 'victory').length;
  const defeat = rows.filter(x => x.status === 'defeat').length;
  const blocked = rows.filter(x => x.status === 'driver_blocked').length;
  if (victory + defeat + blocked !== rows.length) throw new Error('Unclassified campaign outcome');
  const median = values => { const a = values.toSorted((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
  return { samples: rows.length, victory, defeat, blocked, observedWinRate: victory / rows.length,
    medianFinalHp: median(rows.map(x => x.hp)), medianHpLost: median(rows.map(x => x.hpLost)),
    totalPlayed: rows.reduce((s, r) => s + r.played, 0),
    blockedSeeds: rows.filter(r => r.status === 'driver_blocked').map(r => ({ seed: r.seed, reason: r.reason })),
    // Diagnostics only: no arbitrary win-rate threshold gates.
    gameBalanceApproved: false, platformVerified: false };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length > 2 || argv.some(x => !/^\d+$/.test(x))) throw new Error('Usage: node scripts/balance-batch.mjs [startSeed=42] [count=5]');
  const start = Number(argv[0] ?? 42), count = Number(argv[1] ?? 5);
  const batches = seedBatches(start, count);
  const root = 'build/balance-batch';
  mkdirSync(root, { recursive: true });
  const rows = [];
  let source = null;
  for (let index = 0; index < batches.length; index++) {
    const batch = batches[index], directory = `${root}/batch-${index}`;
    const result = spawnSync(process.execPath, ['scripts/m3-normal-campaign.mjs', ...batch.map(String)], {
      cwd: resolve('.'), encoding: 'utf8', timeout: 30 * 60 * 1000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, M3_EVIDENCE_DIR: directory },
    });
    if (result.error || result.status !== 0) throw new Error(`Batch ${index} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
    const summary = JSON.parse(readFileSync(join(directory, 'summary.json'), 'utf8'));
    if (summary.runs?.length !== batch.length || summary.platformVerified !== false
      || typeof summary.sourceCommit !== 'string' || !/^[a-f0-9]{40}$/.test(summary.sourceCommit)) {
      throw new Error(`Batch ${index}: invalid source identity or seed count`);
    }
    if (source && source !== summary.sourceCommit) throw new Error('Source commit changed mid-batch');
    source = summary.sourceCommit;
    for (let i = 0; i < batch.length; i++) {
      const entry = summary.runs[i];
      if (entry.seed !== batch[i] || !/^seed-\d+\.json\.gz$/.test(entry.artifact)) throw new Error('Evidence seed mismatch');
      const evidence = JSON.parse(gunzipSync(readFileSync(join(directory, entry.artifact))).toString('utf8'));
      if (evidence.seed !== entry.seed || evidence.status !== entry.status || evidence.sourceCommit !== source) {
        throw new Error('Evidence report mismatch');
      }
      const row = summarizeEvidence(evidence);
      rows.push(row);
      console.log(`seed=${row.seed} status=${row.status} floor=${row.floor} hp=${row.hp} hpLost=${row.hpLost}`);
    }
  }
  const report = { kind: 'offline-balance-sample', sourceCommit: source,
    driver: 'scripts/m3-normal-campaign.lua', policy: 'warrior75-visible-state-v1',
    seedStart: start, seedCount: count, summary: aggregateRows(rows), rows };
  writeFileSync(join(root, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`Balance report: ${join(root, 'report.json')}`);
  // A mechanics/driver defect fails; a losing game is valid balance evidence.
  if (report.summary.blocked) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { main(); } catch (e) { console.error(e.stack ?? e.message); process.exitCode = 1; }
}
