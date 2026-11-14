import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
const denied=JSON.parse(readFileSync(new URL('./fixtures/character-name-denials.json',import.meta.url),'utf8'));
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateNamingManifest,validateArtifactParity,extractEmbeddedCardNames} from '../scripts/validate-character-source-priority.mjs';
import {preCloseoutCiSource} from './helpers/closeout-ci-source.mjs';

test('naming command package history requires complete current source and preserves drift',()=>{
 const binding=JSON.parse(readFileSync(new URL('./helpers/naming-package-source.json',import.meta.url),'utf8'));
 const source=readFileSync('package.json','utf8').replaceAll('\r\n','\n');
 for(const input of [source,source.replaceAll('\n','\r\n')])assert.equal(preCloseoutCiSource(binding.path,input,'pr620'),binding.source);
 for(const input of [source+'\n',source.slice(1),source.slice(0,-1),source.replace('verify:character-naming','verify:foreign-naming'),source.replaceAll('\n','\r\r\n'),null,{},17])
  assert.equal(preCloseoutCiSource(binding.path,input,'pr620'),input);
 assert.equal(preCloseoutCiSource(binding.path,source,'qualityRatchetIntegrated'),source);
 for(const path of ['__proto__','constructor','foreign/package.json'])assert.equal(preCloseoutCiSource(path,source,'pr620'),source);
});

const make=()=>({
 role:'HT',artifact:'some.html',status:'HOLD',expected_cards:1,
 official_inventory:{P1:{complete:false},P2:{complete:false}},
 cards:[{id:'c19',name:'夜路照明',decision_role:'格挡与下回合抽牌',effect_ref:'c19',
 source:{tier:'P4',kind:'original',verified:false},
 search:{P1:{completed:false},P2:{completed:false},P3:{status:'not_applicable',reason:'No related physical technique for a draw-only card'}},
 review:{status:'BLOCKED',reason:'No provenance or semantic evidence'} }]
});
const clone=x=>JSON.parse(JSON.stringify(x));
const baseApproved=()=>{
 const m=make();m.status='APPROVED';
 m.official_inventory={P1:{complete:true},P2:{complete:true}};
 m.cards[0]={id:'e',name:'蝶引来生',decision_role:'付血强化',effect_ref:'e',
 source:{tier:'P1',kind:'skill',verified:true,exact_text:'蝶引来生',url:'https://example.org/e',section:'战技·蝶引来生',version:'v1'},
 review:{status:'APPROVED',checks:{N2:'pass',N3:'pass',N4:'pass',N5:'pass',N6:'pass'},human:{approved:true,reviewer:'editor',date:'2026-11-13',evidence:'review/e'}}};
 return m;
};
test('historically and user-rejected names cannot be silently restored',()=>{
 const m=make();
 for(const name of ['灯还亮着','夜路照明','掩袖回枪','顺势点梅']){
  m.cards[0].name=name;
  assert.match(validateNamingManifest(m,denied).errors.join(';'),/known rejected name/);
 }
});
test('pending and rejected names remain valid drafts, never naming-ready',()=>{
 const draft=make(); draft.cards[0].name='待命名·c19';
 const report=validateNamingManifest(draft,denied);
 assert.deepEqual(report.errors,[]);
 assert.equal(report.ready,false);
 assert.equal(report.blockers.length,1);
});
test('a fully evidenced P1 name can be approved',()=>{
 const report=validateNamingManifest(baseApproved());
 assert.deepEqual(report.errors,[]);
 assert.equal(report.ready,true);
});

test('human approval and official inventory completion require literal JSON true',()=>{
 for(const value of ['false','true',1,{},[],false,null]){
  for(const field of ['human','P1','P2']){
   const m=baseApproved();
   if(field==='human')m.cards[0].review.human.approved=value;
   else m.official_inventory[field].complete=value;
   const report=validateNamingManifest(m);
   assert.equal(report.ready,false,field+' must reject '+JSON.stringify(value));
   assert.match(report.errors.join(';'),field==='human'?/human reviewer/:/inventory incomplete/);
  }
 }
});
test('cannot label unresolved role as APPROVED',()=>{
 const m=make();m.status='APPROVED';
 assert.match(validateNamingManifest(m).errors.join(' / '),/false APPROVED/);
});
test('P3 cultural term is low tier and cannot skip P1/P2',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P3',kind:'martial',verified:true,exact_text:'拦枪',url:'https://example.org',section:'枪法',version:'v1',
 cultural:{original_term:'拦枪',source_url:'https://example.org',source_entry:'枪法',real_action_meaning:'real spear interception action',mechanic_mapping:'block incoming attacks with a real parry action'}};
 assert.match(validateNamingManifest(m).errors.join(' / '),/missing actual P1 searches/);
 assert.match(validateNamingManifest(m).errors.join(' / '),/missing actual P2 searches/);
});
test('P3 requires real action and effect matching record',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P3',kind:'martial',verified:true,exact_text:'扎枪',url:'https://example.org',section:'枪法',version:'v1'};
 c.search={P1:{completed:true,categories:['skills'],lookups:[{query:'技能',locator:'character skills'}],reason:'No suitable combat skill for this effect',result:'no_suitable'},P2:{completed:true,categories:['story'],lookups:[{query:'official story',locator:'character story'}],reason:'No suitable narrative action phrase',result:'no_suitable'}};
 assert.match(validateNamingManifest(m).errors.join(' / '),/P3 must cite a real technique/);
});
test('P4 original cannot bypass official-first search even if aesthetic checks pass',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P4',kind:'original',verified:true,name_original:true};
 assert.match(validateNamingManifest(m).errors.join(' / '),/missing actual P1 searches/);
 assert.match(validateNamingManifest(m).errors.join(' / '),/missing actual P2 searches/);
 assert.match(validateNamingManifest(m).errors.join(' / '),/P4 needs explicit P3/);
});
test('a generic homepage link without rejected official candidates cannot approve a P4 name',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P4',kind:'original',verified:true,name_original:true};
 c.search={P1:{completed:true,categories:['skills'],lookups:[{query:'胡桃技能',locator:'角色主页'}],reason:'No suitable combat skill for a generic protective action',result:'no_suitable'},
 P2:{completed:true,categories:['story'],lookups:[{query:'胡桃人物故事',locator:'角色主页'}],reason:'No appropriate independent phrase for this card',result:'no_suitable'},
 P3:{status:'not_applicable',reason:'No real martial technique maps to this non-weapon effect'}};
 const errors=validateNamingManifest(m).errors.join(' / ');
 assert.match(errors,/missing actual P1 searches/);
 assert.match(errors,/missing actual P2 searches/);
});
test('documented high-priority rejections and N-GATE evidence allow a genuine P4 exception',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P4',kind:'original',verified:true,name_original:true};
 c.action_context='card_management';
 const rejected=(group)=>({completed:true,categories:[group],
 lookups:[{query:'胡桃 '+group,locator:'官方具体角色条目',url:'https://example.org/entry',entry:'技能与语音具体章节'}],
 rejected_candidates:[{text:'具体官方短语',source_url:'https://example.org/entry',source_entry:'该短语具体条目',rejection_reason:'This expression does not describe a supportive draw ability'}],
 reason:'Official sources have no phrase that fits this defensive draw role',result:'no_suitable'});
 c.search={P1:rejected('skills'),P2:rejected('story'),P3:{status:'not_applicable',reason:'No real weapon or ritual technique fits a general draw action'}};
 assert.equal(validateNamingManifest(m).ready,true);
});
test('P4 weapon action cannot skip P3 by claiming martial art not applicable',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P4',kind:'original',verified:true,name_original:true};
 const documented=(group)=>({completed:true,categories:[group],
 lookups:[{query:'Hu Tao '+group,locator:'exact skill or voice line',url:'https://example.org/entry',entry:'specified source entry'}],
 rejected_candidates:[{text:'official phrase',source_url:'https://example.org/entry',source_entry:'exact entry',rejection_reason:'This official phrase does not fit the physical thrusting action'}],
 reason:'No suitable official source matches the requested physical action',result:'no_suitable'});
 c.action_context='weapon_attack';
 c.search={P1:documented('combat'),P2:documented('story'),P3:{status:'not_applicable',reason:'I have not searched real spear techniques but want an invented name instead'}};
 assert.match(validateNamingManifest(m).errors.join(' / '),/P4 weapon action must search P3/);
});
test('P4 weapon action must record a real P3 candidate and its rejection',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P4',kind:'original',verified:true,name_original:true};
 const documented=(group)=>({completed:true,categories:[group],
 lookups:[{query:'Hu Tao '+group,locator:'exact skill or voice line',url:'https://example.org/entry',entry:'specified source entry'}],
 rejected_candidates:[{text:'official phrase',source_url:'https://example.org/entry',source_entry:'exact entry',rejection_reason:'This official phrase does not fit the physical thrusting action'}],
 reason:'No suitable official source matches the requested physical action',result:'no_suitable'});
 c.action_context='weapon_combo';
 c.search={P1:documented('combat'),P2:documented('story'),P3:{status:'searched',reason:'No suitable authentic technique matches the full effect'}};
 assert.match(validateNamingManifest(m).errors.join(' / '),/P4 P3 search lacks concrete real terms/);
});
test('P4 nonweapon defense may mark P3 not applicable when reason is recorded',()=>{
 const m=baseApproved(),c=m.cards[0];
 c.source={tier:'P4',kind:'original',verified:true,name_original:true};
 const documented=(group)=>({completed:true,categories:[group],
 lookups:[{query:'Hu Tao '+group,locator:'exact skill or voice line',url:'https://example.org/entry',entry:'specified source entry'}],
 rejected_candidates:[{text:'official phrase',source_url:'https://example.org/entry',source_entry:'exact entry',rejection_reason:'This official phrase does not map to draw and defend as used'}],
 reason:'No suitable official source describes this abstract card-management effect',result:'no_suitable'});
 c.action_context='card_management';
 c.search={P1:documented('combat'),P2:documented('story'),P3:{status:'not_applicable',reason:'Pure card draw has no corresponding spear technique or real-world action'}};
 assert.equal(validateNamingManifest(m).ready,true);
});
// Regression: authentic terminology is research for action/animation; it is not automatically a good card name.
const sourcedP3=(name='舞花枪',method='reference_only')=>{
 const m=baseApproved(), c=m.cards[0];
 c.id='u19'; c.name=name; c.decision_role='group attack with low-HP defense';
 c.source={tier:'P3',kind:'martial',verified:true,exact_text:'舞花枪',
  url:'https://iwuf.org/example.pdf',section:'武术套路·枪术',version:'2005',
  name_method:method,
  cultural:{original_term:'舞花枪',source_url:'https://iwuf.org/example.pdf',source_entry:'枪术动作',
   real_action_meaning:'The spear rotates in fast circular movements close to the body',
   mechanic_mapping:'A sweeping group attack with some defensive motion'}};
 const search=(category)=>({completed:true,categories:[category],lookups:[
  {query:'Hu Tao '+category,locator:'specific entry',entry:'exact source passage',url:'https://example.org/entry'}],
  rejected_candidates:[{text:'official phrase',source_url:'https://example.org/entry',source_entry:'specific entry',
   rejection_reason:'This official term is a named burst and not a comparable sweeping move'}],
  result:'no_suitable',reason:'No suitable official player-facing expression for this particular weapon move'});
 c.search={P1:search('skill'),P2:search('story')};
 return m;
};
test('raw cultural technique must not reach player display while pending (舞花枪)',()=>{
 const m=sourcedP3(); m.status='HOLD';m.cards[0].review.status='PENDING';
 assert.match(validateNamingManifest(m).errors.join(' | '),/P3 reference-only technique cannot be player-facing/);
});
test('even fully cited P3 movement cannot automatically become its card name',()=>{
 const m=sourcedP3('舞花枪','cultural_adaptation');
 assert.match(validateNamingManifest(m).errors.join(' | '),/raw martial term requires independent literal exception/);
});
test('literal P3 title is rare, requiring separate exception evidence and explicit signoff',()=>{
 const m=sourcedP3('舞花枪','literal_exception');
 assert.match(validateNamingManifest(m).errors.join(' | '),/P3 literal-title exception lacks independent evidence/);
});
test('a technical term plus a decorative suffix is not meaningful cultural adaptation',()=>{
 const m=sourcedP3('蝶·舞花枪','cultural_adaptation');
 m.cards[0].source.cultural.display_derivation='The source action is a circular spear movement, but this title is only a decorative prefix added to its name';
 m.cards[0].review.character_signature='The title would still look like a training-manual term rather than Hu Tao game skill expression';
 assert.match(validateNamingManifest(m).errors.join(' | '),/P3 cosmetic affix is not a character-specific skill name/);
});
test('P3 research can inform an original player-facing name without masquerading as original skill',()=>{
 const m=sourcedP3('测试用·焰环回击','cultural_adaptation');
 m.cards[0].source.cultural.display_derivation='The real circular spear motion informs the fictional sweeping action, but not its literal title';
 m.cards[0].review.character_signature='This is merely a test fixture; a human reviewer must still separately approve its character-specific imagery';
 assert.equal(validateNamingManifest(m).ready,true);
});
test('source kind cannot masquerade as higher official priority',()=>{
 const m=baseApproved();m.cards[0].source.kind='original';
 assert.match(validateNamingManifest(m).errors.join(' / '),/invalid tier or source kind/);
});
test('a blocked card cannot claim real human approval',()=>{
 const m=make();m.cards[0].review.human={approved:true,reviewer:'someone',date:'2026-11-13',evidence:'x'};
 assert.equal(validateNamingManifest(m).ready,false);
});
test('html and manifest must match all 75 distinct card names',()=>{
 const html="const defs=[\n ['c01','掩袖回枪','普通',\n ['c02','火蝴蝶','普通',\n];\nconst CARDS=Object.freeze({\n e:C('e','蝶引来生','基础'),\n});";
 const names=extractEmbeddedCardNames(html);
 assert.equal(names.map.size,3);
 const m={cards:[{id:'c01',name:'掩袖回枪'},{id:'c02',name:'火蝴蝶'},{id:'e',name:'蝶引来生'}],expected_cards:3};
 assert.deepEqual(validateArtifactParity(m,html).errors,[]);
 m.cards[0].name='夜路照明';
 assert.match(validateArtifactParity(m,html).errors.join(';'),/name differs/);
});
test('all committed full75 HTML candidates require a manifest and hold if unapproved',()=>{
 const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
 const chars=join(root,'experiments/characters');
 if(!existsSync(chars))return;
 for(const role of readdirSync(chars,{withFileTypes:true})){
  if(!role.isDirectory())continue;
  const dir=join(chars,role.name,'full75');
  if(!existsSync(dir))continue;
  const list=readdirSync(dir);
  const htmlFiles=list.filter(n=>n.toLowerCase().endsWith('.html'));
  if(!htmlFiles.length)continue;
  assert.ok(list.includes('naming-review.json'),dir+' missing mandatory naming-review.json');
  const m=JSON.parse(readFileSync(join(dir,'naming-review.json'),'utf8'));
  const r=validateNamingManifest(m,denied);
  assert.deepEqual(r.errors,[],dir+': '+r.errors.join(' / '));
  for(const html of htmlFiles){
    const parity=validateArtifactParity(m,readFileSync(join(dir,html),'utf8'));
    assert.deepEqual(parity.errors,[],html+': '+parity.errors.join(' / '));
  }
 }
});
