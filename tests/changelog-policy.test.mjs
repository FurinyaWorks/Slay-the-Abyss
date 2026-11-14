import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { auditChangelog, validateReleaseChangelog } from '../scripts/check-release-changelog.mjs';

const fixture = () => ({
  packageJson: { version: '1.2.0' },
  lock: { version: '1.2.0', packages: { '': { version: '1.2.0' } } },
  manifest: { '.': '1.2.0' },
  changelog: [
    '# 更新日志', '## [Unreleased]', '## [1.2.0] - 2026-11-12',
    '### 变更', '- 统一战斗与地图画面，让状态更容易辨认。',
    '## [1.1.0] - 2026-11-08',
    '### 修复', '- 修复页面切换中的显示问题。',
  ].join('\n'),
});

test('current repository version and human-facing changelog pass validation', () => {
  assert.deepEqual(validateReleaseChangelog(), []);
  const content = readFileSync('CHANGELOG.md', 'utf8');
  assert.match(content, /^## \[Unreleased\]$/m);
  assert.match(content, /^## \[1\.2\.0\] - 2026-11-12$/m);
});

test('Keep a Changelog Chinese sections and readable player notes pass', () => {
  assert.deepEqual(auditChangelog(fixture()), []);
});

test('package, lockfile and Release Please version drift fail', () => {
  for (const path of ['lock', 'manifest']) {
    const x = fixture();
    if (path === 'lock') x.lock.packages[''].version = '1.0.0';
    else x.manifest['.'] = '1.0.0';
    assert.match(auditChangelog(x).join(' '), /Version mismatch/);
  }
});

test('missing current version, invalid heading and bad version order fail', () => {
  const missing = fixture(); missing.changelog = missing.changelog.replace('## [1.2.0]', '## [1.1.1]');
  assert.match(auditChangelog(missing).join(' '), /missing current version/);
  const heading = fixture(); heading.changelog = heading.changelog.replace('## [Unreleased]', '## 未发布');
  assert.match(auditChangelog(heading).join(' '), /first version heading/);
  const order = fixture(); order.changelog += '\n## [1.2.0] - 2026-11-12\n';
  assert.match(auditChangelog(order).join(' '), /duplicate or unordered/);
});

test('internal terms and vague statements cannot appear in player copy', () => {
  const jargon = fixture();
  jargon.changelog = jargon.changelog.replace('统一战斗与地图画面，让状态更容易辨认。', 'V25 CI 图元重构。');
  assert.match(auditChangelog(jargon).join(' '), /internal jargon/);
  const vague = fixture();
  vague.changelog = vague.changelog.replace('统一战斗与地图画面，让状态更容易辨认。', '优化体验');
  assert.match(auditChangelog(vague).join(' '), /vague player note/);
});
