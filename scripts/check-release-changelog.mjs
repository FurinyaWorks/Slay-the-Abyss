import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseChangelog } from './release-notes.mjs';

// Keep a Changelog structure and SemVer metadata are machine-checked. Player prose is curated.
const plain = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const allowed = new Set(['新增', '变更', '修复']);
const internal = /\b(?:CI|PR|MCP|SDK|SHA|GIL|Lua|npm|Git|GitHub|Backlog|RC|V\d+|M\d+)\b|(?:图元|工作树|合并分支|架构重构|质量棘轮|源代码|构建产物|测试流水线)/i;
const vague = /^(?:优化体验|修复了一些问题|进行了?多项优化|大幅提升游戏品质)/;
const compare = (a, b) => {
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
};

export function auditChangelog({ packageJson, lock, manifest, changelog }) {
  const errors = [], currentVersion = packageJson?.version;
  if (!plain.test(currentVersion ?? '')) errors.push('package.json: invalid plain SemVer version');
  if (lock?.version !== currentVersion || lock?.packages?.['']?.version !== currentVersion ||
      manifest?.['.'] !== currentVersion) errors.push('Version mismatch: package.json, package-lock.json, release-please manifest');
  const headers = [...changelog.matchAll(/^## (.+)$/gm)].map(hit => hit[1]);
  if (headers[0] !== '[Unreleased]') errors.push('CHANGELOG.md: [Unreleased] must be the first version heading');
  let previous, active = null, section = null, currentSeen = false;
  let categories = new Set();
  for (const line of changelog.split(/\r?\n/)) {
    const heading = line.match(/^## (.+)$/);
    if (heading) {
      if (heading[1] === '[Unreleased]') { active = 'Unreleased'; section = null; categories = new Set(); continue; }
      const version = heading[1].match(/^\[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}$/);
      if (!version || !plain.test(version[1])) {
        errors.push('CHANGELOG.md: nonstandard version heading: ' + heading[1]); active = null; continue;
      }
      if (previous && compare(previous, version[1]) <= 0) errors.push('CHANGELOG.md: duplicate or unordered version headings');
      if (plain.test(currentVersion ?? '') && compare(version[1], currentVersion) > 0) errors.push('CHANGELOG.md: future version heading ' + version[1]);
      previous = version[1]; active = version[1]; section = null; categories = new Set();
      if (active === currentVersion) currentSeen = true;
      continue;
    }
    const category = line.match(/^### (.+)$/);
    if (category && active) {
      if (!allowed.has(category[1])) errors.push('CHANGELOG.md: unsupported player category: ' + category[1]);
      if (categories.has(category[1])) errors.push('CHANGELOG.md: duplicate section: ' + category[1]);
      categories.add(category[1]); section = category[1];
      continue;
    }
    const item = line.match(/^[-*] (.+)$/);
    if (!item || !active) continue;
    if (!section) errors.push('CHANGELOG.md: note without a category: ' + item[1]);
    if (active === 'Unreleased' || compare(active, '1.1.0') >= 0) {
      if (internal.test(item[1])) errors.push('CHANGELOG.md: internal jargon in player note: ' + item[1]);
      if (vague.test(item[1])) errors.push('CHANGELOG.md: vague player note: ' + item[1]);
      if ([...item[1]].length > 110) errors.push('CHANGELOG.md: player note should be a concise sentence');
    }
  }
  try { parseChangelog(changelog); }
  catch (error) { errors.push('CHANGELOG.md: ' + error.message); }
  if (!currentSeen) errors.push('CHANGELOG.md: missing current version ' + currentVersion);
  return errors;
}

export function validateReleaseChangelog(root = process.cwd()) {
  const json = file => JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  return auditChangelog({
    packageJson: json('package.json'),
    lock: json('package-lock.json'),
    manifest: json('.release-please-manifest.json'),
    changelog: readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8'),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = validateReleaseChangelog();
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else console.log('Release notes: version metadata, changelog structure and player-language checks passed.');
}
