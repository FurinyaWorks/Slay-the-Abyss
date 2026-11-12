import {artFeatureReceipt} from '../scripts/art-features.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { verifyPlatformRelease, loadChecks, growthWarnings } from '../scripts/platform-load.mjs';
import { checkArchitecture } from '../scripts/check-architecture.mjs';
import { candidateScriptFiles, excludedProductionModules } from '../scripts/native-candidate-scripts.mjs';
import { sourceInputs, payloadDigest } from '../scripts/build-native-candidate.mjs';

// Complete 2x2 synthetic images, not official screenshots or device acceptance.
const raw = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGPUj2xmYGBgYmBgYGBgAAAMWgEPfzx+rwAAAABJRU5ErkJggg==', 'base64');
const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDkKKKK9k8o/9k=', 'base64');
const artifact = {path: 'report.txt', sha256: createHash('sha256').update(raw).digest('hex')};
const measuredAt = '2026-10-30T01:00:00Z';
const now = Date.parse('2026-10-30T02:00:00Z');
// Independent acceptance oracle: removing a required check from production
// must fail these tests rather than silently shrinking the fixture with it.
const requiredChecks = ['staticGlobal', 'staticRegions', 'clientCompute', 'clientMemory', 'serverProcessor',
  'serverMemory', 'combatPeak', 'complexHand', 'enemyEffectsConcurrency', 'sceneTransitions', 'repeatedEntryExit',
  'officialUpload', 'launchAndOperate', 'mobilePerformance', 'mobileInteraction'];
const receipt = {sourceCommit: 'a'.repeat(40), sourceDirty: false, buildId: '12345678-1234-1234-1234-123456789abc',
  payloadDigest: 'b'.repeat(64), candidate: {sha256: 'c'.repeat(64)}, startedAt: '2026-10-30T00:00:00Z',
  release: {notesSha256: 'd'.repeat(64)}};
function fixture() {
  const reading = limitMB => ({source: 'official-editor', unit: 'MB', limitMB, valueMB: 0.01, measuredAt, artifacts: [artifact]});
  return {schemaVersion: 1, sourceCommit: receipt.sourceCommit, buildId: receipt.buildId,
    payloadDigest: receipt.payloadDigest, candidateSha256: receipt.candidate.sha256,
    recordedAt: measuredAt, reviewer: 'fixture reviewer', clientVersion: '7.1.0', uidRedacted: true,
    loadTierUnchanged: true, dynamicDetectionEnabled: true, detectorOverheadAcknowledged: true,
    levelStorage: {...reading(20), valueMB: 8.96}, serverStorage: reading(3),
    rawDynamicReport: {source: 'official-sandbox', artifacts: [artifact]},
    screenshots: {artifacts: [artifact]},
    checks: Object.fromEntries(requiredChecks.map(name => [name, {status: 'PASS', measuredAt, notes: 'fixture reviewed', unresolved: [], artifacts: [artifact]}]))};
}
const verify = (evidence, candidate = receipt, read = () => raw) => verifyPlatformRelease(candidate, evidence, read, now);

test('official evidence is mandatory and a complete matching synthetic fixture passes', () => {
  assert.equal(verify().status, 'UNVERIFIED');
  assert.equal(verify(fixture()).status, 'PASS');
});
test('official screenshots require complete decoded PNG or JPEG bytes bound to the checked hash', () => {
  const withImage = bytes => {
    const evidence = fixture();
    evidence.screenshots.artifacts = [{path: 'image', sha256: createHash('sha256').update(bytes).digest('hex')}];
    return evidence;
  };
  for (const bytes of [raw, jpeg]) {
    assert.equal(verify(withImage(bytes), receipt, path => path === 'image' ? bytes : raw).status, 'PASS');
  }
  const badCrc = Buffer.from(raw); badCrc[badCrc.length - 17] ^= 1;
  const invalid = [raw.subarray(0, 8), raw.subarray(0, raw.length - 12), badCrc,
    jpeg.subarray(0, 3), jpeg.subarray(0, jpeg.length - 20), Buffer.from('P6\n1 1\n255\nabc')];
  for (const bytes of invalid) {
    const result = verify(withImage(bytes), receipt, path => path === 'image' ? bytes : raw);
    assert.equal(result.status, 'BLOCKED', `must reject incomplete or unsupported image (${bytes.length} bytes)`);
    assert(result.errors.some(error => error.includes('screenshots:')));
  }
  const originalOptimize = process.env.PYTHONOPTIMIZE;
  try {
    process.env.PYTHONOPTIMIZE = '1';
    const unsupported = Buffer.from('P6\n1 1\n255\nabc');
    assert.equal(verify(withImage(unsupported), receipt, path => path === 'image' ? unsupported : raw).status, 'BLOCKED',
      'optimized Python must not remove image format validation');
    assert.equal(verify(withImage(raw), receipt, path => path === 'image' ? raw : raw).status, 'PASS');
  } finally {
    if (originalOptimize === undefined) delete process.env.PYTHONOPTIMIZE;
    else process.env.PYTHONOPTIMIZE = originalOptimize;
  }
  let reads = 0;
  const evidence = withImage(raw);
  const result = verify(evidence, receipt, path => path === 'image' ? (++reads === 1 ? raw : raw.subarray(0, 8)) : raw);
  assert.equal(result.status, 'PASS');
  assert.equal(reads, 1, 'decode the exact bytes that passed the evidence hash, without a second path read');
});

test('20MB and 3MB are independent hard limits; 16MB is only a warning', () => {
  for (const [field, limit] of [['levelStorage', 20], ['serverStorage', 3]]) {
    const e = fixture(); e[field].valueMB = limit;
    assert.equal(verify(e).status, 'PASS');
    e[field].valueMB = limit + 0.01;
    assert.equal(verify(e).status, 'BLOCKED');
    for (const value of [-1, NaN, Infinity, '0.01']) { e[field].valueMB = value; assert.equal(verify(e).status, 'BLOCKED'); }
  }
  const e = fixture(); e.levelStorage.valueMB = 16.01;
  assert.equal(verify(e).warnings.length, 1);
  e.levelStorage.source = 'gil-file-size'; assert.equal(verify(e).status, 'BLOCKED');
});
test('each official load and mobile check is required, unresolved anomalies cannot pass', () => {
  assert.deepEqual(loadChecks, requiredChecks);
  for (const key of requiredChecks) {
    const e = fixture(); delete e.checks[key]; assert.equal(verify(e).status, 'BLOCKED', key);
    e.checks[key] = {status: 'PASS', measuredAt, notes: 'reviewed', unresolved: ['overload'], artifacts: [artifact]};
    assert.equal(verify(e).status, 'BLOCKED', key);
  }
});
test('rejects another candidate, old times, altered evidence, dirty source and missing detector report', () => {
  for (const field of ['sourceCommit', 'buildId', 'payloadDigest', 'candidateSha256']) {
    const e = fixture(); e[field] = 'other'; assert.equal(verify(e).status, 'BLOCKED');
  }
  for (const field of ['loadTierUnchanged', 'uidRedacted', 'dynamicDetectionEnabled', 'detectorOverheadAcknowledged']) {
    const e = fixture(); e[field] = false; assert.equal(verify(e).status, 'BLOCKED');
  }
  for (const date of ['2026-10-29', '2030-01-01', 'bad date', '2026-10-30T01:00:00']) {
    const e = fixture(); e.levelStorage.measuredAt = date; assert.equal(verify(e).status, 'BLOCKED');
  }
  assert.equal(verify(fixture(), {...receipt, sourceDirty: true}).status, 'BLOCKED');
  assert.equal(verify(fixture(), {...receipt, release: undefined}).status, 'BLOCKED');
  assert.equal(verify(fixture(), receipt, () => Buffer.from('altered')).status, 'BLOCKED');
  const e = fixture(); delete e.rawDynamicReport; assert.equal(verify(e).status, 'BLOCKED');
});
test('production exclusion has no imports, and growth is reported without treating source bytes as platform MB', () => {
  const a = checkArchitecture(); assert.deepEqual(a.errors, []);
  assert(!a.edges.some(edge => excludedProductionModules.includes(edge.to)));
  const scripts = candidateScriptFiles();
  assert(!scripts.some(row => row.name === 'abyss_random'));
  assert(readFileSync('src/lua/abyss_random.lua').length > 0, 'development source is preserved');
  assert.equal(growthWarnings({luaBytes: 111}, {luaBytes: 100}).length, 1);
});

test('release CLI rejects missing evidence, changed candidate, current payload drift and broken art provenance', () => {
  mkdirSync('build', {recursive: true});
  const directory = mkdtempSync(resolve('build/platform-load-fixture-'));
  try {
    const path = join(directory, 'candidate.gil'), receiptPath = join(directory, 'candidate.json');
    writeFileSync(path, raw);
    const current = {...receipt, artFeatures:artFeatureReceipt({}), payloadDigest: payloadDigest(sourceInputs(process.cwd())),
      candidate: {path, sha256: createHash('sha256').update(raw).digest('hex')}};
    const run = value => {
      writeFileSync(receiptPath, JSON.stringify(value));
      return spawnSync(process.execPath, ['scripts/platform-load.mjs', 'release', receiptPath], {encoding: 'utf8', timeout: 15000});
    };
    let result = run(current);
    assert.equal(result.status, 1); assert.match(result.stdout, /UNVERIFIED/);
    result = run({...current, candidate: {...current.candidate, sha256: 'f'.repeat(64)}});
    assert.equal(result.status, 1); assert.match(result.stderr, /Candidate file changed/);
    result = run({...current, payloadDigest: 'f'.repeat(64)});
    assert.equal(result.status, 1); assert.match(result.stderr, /payload differs/);
    result = run({...current, nativeCardArt: {inputs: [], outputs: []}});
    assert.equal(result.status, 1); assert.match(result.stderr, /native art candidate provenance/);
    assert.equal(JSON.parse(readFileSync('build/platform-load-release.json')).status, 'BLOCKED', 'cannot leave stale PASS after a failure');
  } finally {
    const rel = relative(resolve('build'), directory);
    assert(!isAbsolute(rel) && !rel.startsWith('..') && rel.startsWith('platform-load-fixture-'));
    rmSync(directory, {recursive: true, force: true});
  }
});
