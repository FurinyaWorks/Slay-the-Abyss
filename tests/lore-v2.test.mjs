import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));

test('Lore v2 is preserved as history, not the active copy oracle',()=>{
  const core=read('docs/lore/v2/04-copy/core.zh-CN.json');
  const support=read('docs/lore/v2/04-copy/supporting.zh-CN.json');
  const original=readFileSync('docs/lore/v2/04-copy/CORE_VERBATIM.md','utf8');
  assert.equal(core.schemaVersion,2);
  for(const entry of Object.values(core.flow))assert.ok(original.includes(entry.full),'historical v2 core altered');
  assert.equal(support.merchant.greet,'路不好走吧？来，看看有没有用得上的。');
  assert.equal(support.eventCopy.cleric.choices.join(','),'heal,purify,leave');
  assert.equal(support.eventCopy.purifier.choices.join(','),'pray,leave');
  assert.notEqual(read('data/presentation/narrative.zh-CN.json').flow.intro.full,core.flow.intro.full);
});
