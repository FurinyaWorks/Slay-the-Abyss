// Recollect only reviewed current bytes; immutable predecessor is authenticated.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {discoverJs} from '../../scripts/ci-shards.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
const binding=source=>({source,sha256:hash(source),gitBlob:createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex')});
const base='903bf2a31e91f10fb24763ab4cea23d586d0bb83';
const reviewedPaths=[
 'data/presentation/ui_theme.json','scripts/cinematic-ui-layout.mjs','scripts/deck-ui-layout.mjs',
 'scripts/official-assets-layout.mjs','scripts/official-battle-hud.mjs','scripts/official-run-layout.mjs',
 'scripts/v25-layout.mjs','scripts/v25-node-layout.mjs','scripts/official-run-hud-components.mjs',
 'tests/ci-complete-calibration.test.mjs','tests/defect-final-source-epoch.test.mjs',
 'tests/encounter-formation-source-epoch.test.mjs','tests/integration-source-epoch.test.mjs',
 'tests/helpers/closeout-source-closure.json','tests/helpers/closeout-source-epoch.mjs',
 'tests/helpers/copy-integration-source-closure.mjs','tests/official-assets-runtime.test.mjs',
 'tests/official-run-chrome.test.mjs','tests/official-run-hud-reuse.test.mjs',
 'tests/lua/merchant_action_group.lua','tests/lua/merchant_dialogue_lifecycle.lua',
 'tests/lua/support/node_ui_cases.lua','tests/merchant-action-group.test.mjs','tests/node-ui-layout.test.mjs',
 'tests/lua/map_utility_header.lua','tests/map-utility-header.test.mjs','tests/official-assets.test.mjs',
];
export function collectRunHudCiSource(){
 const oldBytes=readFileSync('tests/helpers/closeout-ci-source.json.gz');
 assert.equal(hash(oldBytes),'cfc72306af30d0d4b0b61398e3ed0eea36767d6e005c146eb215897fc431a8f8');
 const old=JSON.parse(gunzipSync(oldBytes)),files={};
 const beforeHashes={...old.current,...old.luaHashes};
 for(const [path,id]of Object.entries(beforeHashes)){
  if(id===null)continue;
  const current=norm(readFileSync(path,'utf8'));if(hash(current)===id)continue;
  const prior=old.records[id]??execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:16*1024*1024});
  assert.equal(hash(prior),id,'exact original predecessor: '+path);
  files[path]={before:binding(prior),after:binding(current)};
 }
 // Receipt input closures also include support files outside discovery/current.
 // Authenticate their complete baseline directly against the pinned Git tree.
 const changed=execFileSync('git',['diff',base,'--name-only','--','scripts','tests'],{encoding:'utf8'}).trim().split('\n');
 const baseFiles=new Set(execFileSync('git',['ls-tree','-r','--name-only',base,'--','scripts','tests'],{encoding:'utf8'}).trim().split('\n'));
 for(const path of changed){
  if(files[path]||!baseFiles.has(path)||path.startsWith('tests/helpers/')||! /\.(mjs|lua|json)$/.test(path))continue;
  const prior=execFileSync('git',['show',base+':'+path],{encoding:'utf8',maxBuffer:16*1024*1024});
  const current=norm(readFileSync(path,'utf8'));
  if(current!==prior)files[path]={before:binding(prior),after:binding(current)};
 }
 for(const path of ['scripts/official-run-hud-components.mjs','tests/official-run-hud-reuse.test.mjs']){
  files[path]={before:null,after:binding(norm(readFileSync(path,'utf8')))};
 }
 assert.deepEqual(Object.keys(files).sort(),[...reviewedPaths].sort(),'only the reviewed complete source continuation');
 const afterInventory=discoverJs(),addedTests=afterInventory.filter(path=>!old.inventory.includes(path));
 assert.deepEqual(addedTests,['tests/official-run-hud-reuse.test.mjs'],'only reviewed new regression');
 assert.deepEqual(afterInventory.filter(path=>!addedTests.includes(path)),old.inventory,'complete predecessor inventory retained');
 for(const [path,row]of Object.entries(files))assert.equal(hash(norm(readFileSync(path,'utf8'))),row.after.sha256,'fresh current source: '+path);
 const baseHashes=Object.fromEntries(Object.entries(files).filter(([,row])=>row.before).map(([path,row])=>[path,row.before.sha256]));
 return {schemaVersion:1,normalization:'LF',base,baseHashes,files,beforeInventory:old.inventory,afterInventory,addedTests};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/generate-run-hud-ci-source.mjs')){
 assert(['--write-archive','--check'].includes(process.argv[2]));
 const bytes=gzipSync(Buffer.from(JSON.stringify(collectRunHudCiSource())),{level:9}),path='tests/helpers/run-hud-ci-source.json.gz';
 if(process.argv[2]==='--write-archive')writeFileSync(path,bytes);
 else assert.deepEqual(readFileSync(path),bytes,'stale run HUD complete-source archive');
 console.log(JSON.stringify({archiveSha256:hash(bytes),bytes:bytes.length}));
}
