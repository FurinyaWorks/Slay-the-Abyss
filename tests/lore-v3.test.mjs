import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const livePath='data/presentation/narrative.zh-CN.json';
const approvedPath='docs/lore/v3/approved.zh-CN.json';
const ledgerPath='docs/lore/v3/SOURCES.json';
function visibleFields(copy){
  const out={title:copy.title};
  for(const [id,row] of Object.entries(copy.flow))out['flow.'+id+'.full']=row.full;
  for(const [id,value] of Object.entries(copy.merchant))out['merchant.'+id]=value;
  for(const [id,value] of Object.entries(copy.combatIntros))out['combatIntros.'+id]=value;
  for(const [id,row] of Object.entries(copy.eventCopy))out['eventCopy.'+id+'.intro']=row.intro;
  return out;
}
function verify(copy,approved,ledger){
  assert.deepEqual(copy,approved,'runtime diverges from reviewed copy');
  assert.equal(ledger.schemaVersion,1);
  const entries=visibleFields(approved);
  assert.deepEqual(Object.keys(ledger.fields).sort(),Object.keys(entries).sort(),'every narrative field needs provenance');
  for(const [key,value] of Object.entries(entries)){
    assert.equal(typeof value,'string',key);
    const {ref,decision}=ledger.fields[key]??{};
    assert.ok(ledger.references[ref]&&typeof decision==='string'&&decision.length>0,key+' has no reviewed basis');
    if(value==='')assert.equal(decision,'intentional-absence',key+' is empty without an explicit decision');
    if(decision==='inactive-legacy-needs-review-before-use')assert.ok(key.startsWith('combatIntros.'),key);
  }
  for(const ref of Object.values(ledger.references)){
    if(ref.path)assert.ok(existsSync(ref.path),ref.path+' does not exist');
    if(ref.commit)assert.match(ref.commit,/^[0-9a-f]{40}$/,'source commit identity must be pinned');
    if(ref.url)assert.match(ref.url,/^https:\/\/(ys\.mihoyo\.com|genshin\.hoyoverse\.com)\//);
  }
  assert.equal(approved.source,'docs/lore/v3/README.md');
  assert.equal(approved.title,'Slay the Heavens');
}
test('Lore v3 runtime is identical to an independently reviewed snapshot with complete source mapping',()=>{
  verify(read(livePath),read(approvedPath),read(ledgerPath));
});
test('the copy ratchet catches changed text and missing review metadata',()=>{
  const live=read(livePath),approved=read(approvedPath),ledger=read(ledgerPath);
  for(const path of ['flow.intro.full','merchant.greet','merchant.insufficientGold','eventCopy.cleric.intro','eventCopy.purifier.intro','eventCopy.living_wall.intro']){
    const changed=structuredClone(live),parts=path.split('.'),key=parts.pop(),target=parts.reduce((o,p)=>o[p],changed);
    target[key]+='错';
    assert.throws(()=>verify(changed,approved,ledger),{code:'ERR_ASSERTION'},path);
  }
  const lost=structuredClone(ledger);delete lost.fields['merchant.greet'];
  assert.throws(()=>verify(live,approved,lost),{code:'ERR_ASSERTION'});
});
test('native event copy still fits original body and option frames without shrinking type',()=>{
  const copy=read(livePath),event=nativeTheme.layout.nativeNode.event;
  for(const {intro} of Object.values(copy.eventCopy)){
    const rows=intro.replaceAll('\n\n','\n').split('\n').reduce(
      (n,line)=>n+Math.max(1,Math.ceil([...line].length*nativeTheme.font.body/event.body[2])),0);
    assert.ok(rows*nativeTheme.layout.nativeText.lineHeight<=event.body[3],intro);
  }
  const bottom=frame=>frame[1]-frame[3]/2,top=frame=>frame[1]+frame[3]/2;
  assert.ok(bottom(event.name)>=top(event.body));
  assert.ok(bottom(event.body)>=event.options.rows[0]+event.options.size[1]/2);
  assert.ok(event.options.rows[2]-event.options.size[1]/2>=top(nativeTheme.layout.nativeNode.confirm));
});
test('active story surfaces never revert to old seal plot or brand',()=>{
  const paths=['data/presentation/narrative.zh-CN.json','src/lua/abyss_game_ui_menu_view.lua',
    'src/lua/abyss_neow.lua','src/lua/abyss_game_ui_view.lua','scripts/game-ui-layout.mjs'];
  const banned=['杀戮原塔2','岩脉残响','深渊已被封印','封印仍在崩解','高塔之下','前往高塔'];
  for(const path of paths){
    const source=readFileSync(path,'utf8');
    for(const phrase of banned)assert.ok(!source.includes(phrase),path+': obsolete text '+phrase);
  }
  const neowSource=readFileSync('src/lua/abyss_neow.lua','utf8');
  assert.match(neowSource,/require\(['"]abyss_narrative['"]\)/,
    'Neow must import the generated narrative module');
  assert.match(neowSource,/event\.stage,event\.body='neow_intro',Narrative\.flow\.intro\.full/,
    'Neow must read the shared narrative field rather than hard-code a duplicate');
  assert.ok(!neowSource.includes(read(livePath).flow.intro.full),
    'Neow must not copy the approved sentence into another hard-coded source');
  assert.equal(read(livePath).flow.bossEntrance.full,'');
  assert.equal(read(livePath).flow.defeat.full,'');
});
