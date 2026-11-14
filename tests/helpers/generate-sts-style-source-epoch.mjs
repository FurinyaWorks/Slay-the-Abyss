// Exact current-source collector. It never rewrites any predecessor archive.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {ciRepairSourceEpoch} from './closeout-source-epoch.mjs';
import {runHudCiProof} from './run-hud-ci-source.mjs';
import {discoverJs} from '../../scripts/ci-shards.mjs';
export const stsStyleBase='cb1eac63620b908d880b8a339ab834b1b533dfc1';
export const stsStyleSourceCommit='a73043a738cd5c6d11b3f6a66ef7383cbd463c01';
const norm=s=>s.replaceAll('\r\n','\n'),hash=s=>createHash('sha256').update(s).digest('hex');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
const binding=source=>({source,sha256:hash(source),gitBlob:blob(source)});
const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
export const stsStyleOwners=Object.freeze(['config/architecture.json',...[
 'card_art_runtime','card_display','card_skin','character_select_view','choice_ui','controller','deck_ui',
 'game_ui','game_ui_input','game_ui_lifecycle','game_ui_overlays','game_ui_run','game_ui_view','match_event_ui',
 'node_ui_events','node_ui_faces','node_ui_feedback','node_ui_lifecycle','page_reveal','traveler_portraits','ui','v25_texture_runtime',
].map(n=>'src/lua/abyss_'+n+'.lua')].sort());
export const stsStyleAddedTests=Object.freeze([
 'tests/sts-card-reference-runtime.test.mjs','tests/sts-card-reference.test.mjs','tests/sts-character-browser.test.mjs',
 'tests/sts-character-reference.test.mjs','tests/sts-neow-choice.test.mjs','tests/sts-neow-guide.test.mjs',
 'tests/sts-neow-runtime.test.mjs','tests/sts-page-reveal.test.mjs','tests/sts-style-source-epoch.test.mjs',
]);
const inventory=()=>['config/architecture.json',...readdirSync('src/lua').filter(n=>n.endsWith('.lua')).map(n=>'src/lua/'+n)].sort();
const gitSources=revision=>Object.fromEntries(git(['ls-tree','-r','--format=%(path) %(objectname)',revision,'--','config/architecture.json','src/lua']).trim().split('\n').map(s=>s.split(' ')).filter(([p])=>p==='config/architecture.json'||p.endsWith('.lua')));
export function collectStsStyleProduction(){
 const prior=ciRepairSourceEpoch.proof.current,beforeGit=gitSources(stsStyleBase),afterGit=gitSources(stsStyleSourceCommit);
 assert.deepEqual(Object.keys(beforeGit).sort(),Object.keys(prior).sort(),'complete committed CI-repair predecessor');
 for(const [p,row]of Object.entries(prior))assert.equal(blob(row.source),beforeGit[p],'complete CI-repair source: '+p);
 const beforeInventory=Object.keys(prior).sort(),afterInventory=inventory(),addedPaths=['src/lua/abyss_page_reveal.lua'];
 assert.deepEqual(afterInventory,[...beforeInventory,...addedPaths].sort(),'complete current style source inventory');
 assert.deepEqual(afterInventory,Object.keys(afterGit).sort(),'complete frozen style source commit');
 const samples={},current={},before={};
 for(const path of afterInventory){
  const source=norm(readFileSync(path,'utf8'));samples[path]=source;
  assert.equal(blob(source),afterGit[path],'frozen production source: '+path);
  if(!stsStyleOwners.includes(path))assert.equal(hash(source),prior[path].sha256,'unregistered style source drift: '+path);
 }
 for(const path of stsStyleOwners){current[path]=binding(samples[path]);before[path]=prior[path]??null;}
 assert.deepEqual(inventory(),afterInventory,'style inventory changed during collection');
 for(const [p,s]of Object.entries(samples))assert.equal(norm(readFileSync(p,'utf8')),s,'style source changed during collection: '+p);
 return {schemaVersion:1,normalization:'LF',baseCommit:stsStyleBase,currentCommit:stsStyleSourceCommit,
  inventoryBefore:beforeInventory,inventoryAfter:afterInventory,addedPaths,owners:stsStyleOwners,current,before};
}
const reviewedCiPaths=Object.freeze([
 'data/presentation/ui_theme.json','.gitattributes','config/ci-media-lfs.json','docs/legal/assets.json',
 'docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs',...[
  'game-ui-layout','noncombat-neow-layout','noncombat-v25-layout','official-assets-layout','official-battle-card-chrome',
  'official-portraits','official-run-layout','sts-card-reference-profile','sts-character-select-layout','sts-neow-choice-layout',
  'sts-neow-guide-layout','v25-battle-scene','v25-character-layout','test-lua','test-affected','ci-media-lfs','check-license',
 ].map(n=>'scripts/'+n+'.mjs'),...[
  'ci-complete-calibration','integration-source-epoch','defect-final-source-epoch','encounter-formation-source-epoch',
  'lumine-idle','official-assets','official-portraits-build','official-run-chrome',
  'noncombat-v25-layout','official-assets-legibility','defect-actor-boundary','test-affected','ci-reviewed-lfs',
 ].map(n=>'tests/'+n+'.test.mjs'),...stsStyleAddedTests,
 'tests/helpers/closeout-source-epoch.mjs','tests/helpers/closeout-source-closure.json','tests/helpers/copy-integration-source-closure.mjs',
]);
const reviewedHelpers=Object.freeze([
 'generate-sts-style-source-epoch','sts-style-source-epoch-runtime','sts-style-source-proof','sts-style-ci-source','sts-style-prior-runtime',
 'historical-sts-style-runner','historical-sts-style-entry','run-hud-ci-source','generate-shop-deck-source-epoch',
 'closeout-source-epoch','copy-integration-source-closure',
].map(n=>'tests/helpers/'+n+'.mjs').concat('tests/helpers/combined-epoch/source-epoch.mjs'));
// These exact non-application inputs participate in CI execution. Never scan
// all docs or config; state-evidence payloads remain under their LFS manifest.
const reviewedCiInputs=Object.freeze(['.gitattributes','config/ci-media-lfs.json','docs/legal/assets.json',
 'docs/evidence/sts-neow-reference-20261113/verify-runtime-equivalence.mjs']);
export function collectStsStyleCi(){
 const scope=['scripts','tests','data',...reviewedCiInputs];
 const basePaths=new Set(git(['ls-tree','-r','--name-only',stsStyleBase,'--',...scope]).trim().split('\n'));
 const changed=git(['diff',stsStyleBase,'--name-only','--',...scope]).trim().split('\n').filter(Boolean);
 const wanted=new Set([...changed.filter(p=>!p.startsWith('tests/helpers/')),...stsStyleAddedTests,
  ...reviewedHelpers,...reviewedCiInputs,'tests/helpers/closeout-source-epoch.mjs','tests/helpers/closeout-source-closure.json','tests/helpers/copy-integration-source-closure.mjs']);
 const files={};
 for(const path of [...wanted].sort()){
  assert(reviewedCiPaths.includes(path)||reviewedHelpers.includes(path),'unregistered style CI source: '+path);
  const after=norm(readFileSync(path,'utf8')),before=basePaths.has(path)?git(['show',stsStyleBase+':'+path]):null;
  if(before!==after)files[path]={before:before===null?null:binding(before),after:binding(after)};
 }
 const beforeInventory=runHudCiProof.afterInventory,afterInventory=discoverJs();
 assert.deepEqual(afterInventory.filter(p=>!beforeInventory.includes(p)),stsStyleAddedTests,'exact new style Full inventory');
 assert.deepEqual(afterInventory.filter(p=>!stsStyleAddedTests.includes(p)),beforeInventory,'complete prior Full inventory retained');
 for(const p of stsStyleAddedTests)assert(files[p]?.before===null,'new style test witness: '+p);
 for(const [p,row]of Object.entries(files))assert.equal(hash(norm(readFileSync(p,'utf8'))),row.after.sha256,'fresh style CI source: '+p);
 const helperSources=Object.fromEntries(reviewedHelpers.map(p=>[p,binding(norm(readFileSync(p,'utf8')))]));
 return {schemaVersion:1,normalization:'LF',baseCommit:stsStyleBase,files,helperSources,
  bindingLeaf:'tests/helpers/sts-style-ci-binding.mjs (fixed archive guard; never self-hashed)',beforeInventory,afterInventory,addedTests:stsStyleAddedTests};
}
export function collectStsStylePriorRuntime(){
 const all=git(['ls-tree','-r','--name-only',stsStyleBase]).trim().split('\n');
 const wanted=all.filter(p=>/^(?:src\/lua\/|scripts\/|data\/|config\/|tools\/|tests\/lua\/)/.test(p)&&/\.(?:mjs|js|json|lua|py|yml|yaml)$/.test(p)
  ||['package.json','package-lock.json','CHANGELOG.md','.release-please-manifest.json'].includes(p));
 const ids=git(['ls-tree','-r','--format=%(path) %(objectname)',stsStyleBase]).trim().split('\n');
 const byPath=new Map(ids.map(s=>s.split(' '))),files={};
 // One Git batch reads the complete original source; no process per file.
 const result=execFileSync('git',['cat-file','--batch'],{input:wanted.map(p=>byPath.get(p)).join('\n')+'\n',maxBuffer:64*1024*1024});
 let at=0;
 for(const path of wanted){const end=result.indexOf(10,at),header=result.subarray(at,end).toString(),parts=header.split(' '),size=Number(parts[2]);
  assert.equal(parts[0],byPath.get(path));assert.equal(parts[1],'blob');assert(Number.isSafeInteger(size));at=end+1;
  const bytes=result.subarray(at,at+size);assert.equal(result[at+size],10);at+=size+1;
  const source=bytes.toString('utf8');assert.equal(blob(source),byPath.get(path),'original runtime bytes: '+path);files[path]=binding(source);
 }
 assert.equal(at,result.length);
 return {schemaVersion:1,baseCommit:stsStyleBase,kind:'complete committed pre-style executable/text inputs; art and dependencies are read-only unchanged resources',files};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/generate-sts-style-source-epoch.mjs')){
 assert(['--write-archives','--check'].includes(process.argv[2]));
 const reports={};
 for(const [name,collect]of [['sts-style-source-epoch',collectStsStyleProduction],['sts-style-ci-source',collectStsStyleCi],['sts-style-prior-runtime',collectStsStylePriorRuntime]]){
  const bytes=gzipSync(Buffer.from(JSON.stringify(collect())),{level:9}),path='tests/helpers/'+name+'.json.gz';
  if(process.argv[2]==='--write-archives')writeFileSync(path,bytes);else assert.deepEqual(readFileSync(path),bytes,'stale '+name);
  reports[name]={sha256:hash(bytes),bytes:bytes.length};
 }
 console.log(JSON.stringify(reports,null,2));
}
