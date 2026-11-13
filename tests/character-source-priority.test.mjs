import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateNamingManifest,validateArtifactParity,extractEmbeddedCardNames} from '../scripts/validate-character-source-priority.mjs';

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
test('pending and rejected names remain valid drafts, never naming-ready',()=>{
 const report=validateNamingManifest(make());
 assert.deepEqual(report.errors,[]);
 assert.equal(report.ready,false);
 assert.equal(report.blockers.length,1);
});
test('a fully evidenced P1 name can be approved',()=>{
 const report=validateNamingManifest(baseApproved());
 assert.deepEqual(report.errors,[]);
 assert.equal(report.ready,true);
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
test('source kind cannot masquerade as higher official priority',()=>{
 const m=baseApproved();m.cards[0].source.kind='original';
 assert.match(validateNamingManifest(m).errors.join(' / '),/invalid tier or source kind/);
});
test('a blocked card cannot claim real human approval',()=>{
 const m=make();m.cards[0].review.human={approved:true,reviewer:'someone',date:'2026-11-13',evidence:'x'};
 assert.equal(validateNamingManifest(m).ready,false);
});
test('html and manifest must match all 75 distinct card names',()=>{
 const html="const defs=[\\n ['c01','掩袖回枪','普通',\\n ['c02','火蝴蝶','普通',\\n];\\nconst CARDS=Object.freeze({\\n e:C('e','蝶引来生','基础'),\\n});";
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
  const r=validateNamingManifest(m);
  assert.deepEqual(r.errors,[],dir+': '+r.errors.join(' / '));
  for(const html of htmlFiles){
    const parity=validateArtifactParity(m,readFileSync(join(dir,html),'utf8'));
    assert.deepEqual(parity.errors,[],html+': '+parity.errors.join(' / '));
  }
 }
});
