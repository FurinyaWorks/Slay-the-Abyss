import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import * as lfs from '../scripts/ci-reviewed-lfs.mjs';
import { reviewedPngPaths, needsReviewedAssets, verifyReviewedPngs, prepareReviewedAssets, lfsEnvironment, lfsArguments } from '../scripts/ci-reviewed-lfs.mjs';
import {mediaFiles,originalMediaFiles,evidenceFiles,archiveFiles,mediaPointer,maxMediaPayloadBytes,maxEvidencePayloadBytes,maxArchivePayloadBytes,validateMediaPointers,prepareMediaAssets} from '../scripts/ci-media-lfs.mjs';
import {checkWhitespace,validateMediaBases} from '../scripts/ci-whitespace.mjs';
import {prepareComparisonBlobs,comparisonBlobIds} from '../scripts/ci-comparison-blobs.mjs';
import {checkHostedCheckout,checkNetworkPolicy} from '../scripts/check-network-policy.mjs';
import {sensitive,checkAssets} from '../scripts/check-license.mjs';

const root = resolve('.');
const expectedPaths = ['armaments', 'cleave', 'heavy_blade'].flatMap(id => ['source.png', 'preview-native.png'].map(name => `art/cards/traveler-geo/${id}/${name}`));
const source = readFileSync('scripts/ci-reviewed-lfs.mjs', 'utf8');
// Synthetic pixels keep this CI-contract test independent of the real asset
// consumer's shard. Only the frozen data table changes in this test copy;
// actual Git/LFS transport, pointer budget and PNG verification code is unchanged.
const fakePngs = expectedPaths.map((_,index) => {
  const bytes=Buffer.alloc(64,index+1); Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes); bytes.write('IHDR',12); return bytes;
});
function fixtureSource(text) {
  const table = /export const frozenObjects = \[[\s\S]*?\n\];/;
  assert.equal([...text.matchAll(new RegExp(table,'g'))].length,1);
  return text.replace(table, 'export const frozenObjects = '+JSON.stringify(fakePngs.map(b=>[createHash('sha256').update(b).digest('hex'),b.length]))+';');
}
const fixtureModuleDir=mkdtempSync(join(tmpdir(),'abyss-lfs-module-'));
after(()=>rmSync(fixtureModuleDir,{recursive:true,force:true}));
const fixtureModulePath=join(fixtureModuleDir,'ci-reviewed-lfs.mjs');
writeFileSync(fixtureModulePath,fixtureSource(source));
const fixtureLfs=await import(pathToFileURL(fixtureModulePath).href);

const shardStep = `      - name: Materialize reviewed PNGs for this shard\n        timeout-minutes: 2\n        env:\n          CI_LFS_TOKEN: \${{ github.token }}\n        run: node scripts/ci-shards.mjs --prepare=\${{ matrix.shard }}/\${{ strategy.job-total }}\n`;
const licenseStep = `      - name: Materialize reviewed PNGs for the license audit\n        timeout-minutes: 2\n        env:\n          CI_LFS_TOKEN: \${{ github.token }}\n        run: node scripts/ci-reviewed-lfs.mjs\n`;
function temp(t) { const dir = mkdtempSync(join(tmpdir(), 'abyss-reviewed-lfs-')); t.after(() => rmSync(dir, { recursive: true, force: true })); return dir; }
function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'core.hooksPath=', ...args], { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_NO_LAZY_FETCH: '1', GIT_LFS_SKIP_SMUDGE: '1', GIT_TERMINAL_PROMPT: '0' }, timeout: 30000 });
  assert.ifError(r.error); assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
}
function fixture(t) {
  const dir = temp(t); git(dir, 'init');
  // Copy one existing commit object verbatim, not its tree/history and not a
  // new commit. Alternates would also let LFS silently borrow the source cache,
  // invalidating the missing-object negative control.
  const commit = spawnSync('git', ['cat-file','commit','HEAD'], {cwd:root,windowsHide:true});
  assert.equal(commit.status,0);
  const copied = spawnSync('git', ['hash-object','-t','commit','-w','--stdin'], {cwd:dir,input:commit.stdout,encoding:'utf8',windowsHide:true});
  assert.equal(copied.status,0); assert.equal(copied.stdout.trim(),git(root,'rev-parse','HEAD'));
  git(dir, 'update-ref', 'refs/heads/fixture', copied.stdout.trim());
  git(dir, 'symbolic-ref', 'HEAD', 'refs/heads/fixture');
  for (const [key,value] of [['clean','git-lfs clean -- %f'],['smudge','git-lfs smudge -- %f'],['process','git-lfs filter-process'],['required','true']]) git(dir, 'config', '--local', `filter.lfs.${key}`, value);
  git(dir, 'config', '--local', 'lfs.url', pathToFileURL(join(dir, 'absent-server')).href);
  const extra = 'art/cards/future/source.png';
  writeFileSync(join(dir, '.gitattributes'), [...expectedPaths,extra].map(p => `${p} filter=lfs diff=lfs merge=lfs -text`).join('\n')+'\n');
  const bytes = new Map();
  for (const [i,path] of [...expectedPaths,extra].entries()) {
    const png = expectedPaths.includes(path) ? fakePngs[expectedPaths.indexOf(path)] : Buffer.alloc(64,i+1);
    if (path === extra) { Buffer.from([137,80,78,71,13,10,26,10]).copy(png); png.write('IHDR',12); }
    mkdirSync(join(dir,path,'..'), {recursive:true}); writeFileSync(join(dir,path),png); bytes.set(path,png);
  }
  for (const id of ['armaments','cleave','heavy_blade']) {
    const files = Object.fromEntries(['source.png','preview-native.png'].map(name => { const b=bytes.get(`art/cards/traveler-geo/${id}/${name}`); return [name,{bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')}]; }));
    writeFileSync(join(dir,`art/cards/traveler-geo/${id}/asset.json`),JSON.stringify({files}));
  }
  git(dir,'add','.gitattributes',...expectedPaths,extra);
  for (const p of [...expectedPaths,extra]) writeFileSync(join(dir,p),git(dir,'show',':'+p)+'\n');
  const object = path => { const oid=createHash('sha256').update(bytes.get(path)).digest('hex'); return join(dir,'.git/lfs/objects',oid.slice(0,2),oid.slice(2,4),oid); };
  rmSync(object(extra)); // Broadening the pull to future art would now fail offline.
  return {dir,bytes,object,extra};
}
function workflowContract(quality, licenses) {
  assert.deepEqual(checkNetworkPolicy(quality),[],'current transport safety remains complete');
  assert.match(quality,/\npermissions:\n  contents: read\n/); assert.match(licenses,/\npermissions:\n  contents: read\n/);
  assert.doesNotMatch(quality+licenses,/contents: write|lfs:\s*true|persist-credentials:\s*true|actions\/cache/);
  assert.equal(quality.split(shardStep).length-1,2);
  assert.ok(quality.includes(shardStep+'      - name: JavaScript regression shard\n'));
  assert.ok(quality.includes(shardStep+'      - name: POSIX JavaScript regression shard\n'));
  assert.ok(licenses.includes(licenseStep+'      - run: node --test scripts/check-license.test.mjs\n'));
  assert.ok(quality.includes("          CI_REPOSITORY: ${{ github.repository }}\n          GIT_LFS_SKIP_SMUDGE: '1'\n"));
  assert.doesNotMatch(quality.match(/\n  presentation:\n([\s\S]*?)(?=\n  engineering-posix-shards:)/)[1],/ci-reviewed-lfs|lfs:\s*true/);
}

test('only the exact six reviewed PNG paths are eligible; child auth is ephemeral and sanitized', () => {
  assert.deepEqual(reviewedPngPaths, expectedPaths);
  assert.deepEqual(lfs.frozenObjects,[
    ['e63cd8703ce983eb1556efa31a017b803e31c7b887e9c3e14c77bd3ba9928332',1750604],
    ['b7b2cd9c4fdfa3f1d893156405a51afc8b8bd1b65a776a9f704086c97685b2ff',30121],
    ['6e37a7b9264154a2cd7e6560a625cf001b3b00d63e8fdbf4d01369a714397155',2091086],
    ['271c49cc6248cf46ea029cc63387c682858b43c29288eb32b44d24175e662b39',36567],
    ['1cf7dec3ef1f9ae369837204c24b0ce727142909f200c225d252dd85760bdbfc',2041123],
    ['aefb4d2ca114a8738029249fba8b1bdc4f6235be648684cbfe348ed496388936',34027],
  ]);
  assert.deepEqual(lfsArguments.slice(-6), ['lfs','pull','--include',expectedPaths.join(','),'--exclude','']);
  assert.ok(lfsArguments.includes('credential.helper=')); assert.ok(lfsArguments.includes('lfs.transfer.maxretries=0'));
  assert.ok(!lfsArguments.includes('--all') && !lfsArguments.includes('--recent'));
  const env = {CI_LFS_TOKEN:'not-a-real-token',UNCHANGED:'yes'};
  const child = lfsEnvironment(env);
  assert.equal(child.CI_LFS_TOKEN,undefined); assert.equal(env.CI_LFS_TOKEN,'not-a-real-token');
  assert.equal(child.GIT_TERMINAL_PROMPT,'0'); assert.equal(child.GIT_CONFIG_COUNT,'1');
  assert.equal(child.GIT_CONFIG_KEY_0,'http.https://github.com/.extraheader');
  assert.equal(child.GIT_CONFIG_VALUE_0,'AUTHORIZATION: basic '+Buffer.from('x-access-token:not-a-real-token').toString('base64'));
});

test('real native Node CLI agrees with asset owner before and after insertion shifts the sorted position', t => {
  const dir=temp(t); mkdirSync(join(dir,'tests'));
  const name='reviewed-traveler-geo-assets.test.mjs';
  const names=['a.test.mjs','b.test.mjs',name,'z.test.mjs'];
  const env={...process.env}; delete env.NODE_TEST_CONTEXT;
  for (const added of [null,'aa-new.test.mjs']) {
    if(added) names.push(added);
    for(const n of names) writeFileSync(join(dir,'tests',n),`import test, { after } from 'node:test';test(${JSON.stringify(n)},()=>{});\n`);
    const files=readdirSync(join(dir,'tests')).filter(n=>n.endsWith('.test.mjs')).map(n=>'tests/'+n);
    for(const total of [1,2,4,8]) for(let shard=1;shard<=total;shard++) {
      const r=spawnSync(process.execPath,['--test',`--test-shard=${shard}/${total}`,'--test-reporter=tap','tests/*.test.mjs'],{cwd:dir,env,encoding:'utf8',windowsHide:true,timeout:30000});
      assert.ifError(r.error); assert.equal(r.status,0,r.stderr+r.stdout);
      const actual=r.stdout.includes('# Subtest: '+name+'\n');
      assert.equal(needsReviewedAssets(files,`${shard}/${total}`),actual,`${added??'original'} ${shard}/${total}`);
    }
  }
  for(const invalid of ['0/8','9/8','1/0','x','1/8;echo bad']) assert.throws(()=>needsReviewedAssets(names,invalid),/Invalid shard/);
  assert.throws(()=>needsReviewedAssets(['tests/other.test.mjs'],'1/2'),/reviewed asset test/);
});

test('non-owner shard does not inspect PNGs or start Git, while materialized bytes reuse the local cache', t => {
  const dir=temp(t); git(dir,'init'); mkdirSync(join(dir,'tests')); writeFileSync(join(dir,'tests/reviewed-traveler-geo-assets.test.mjs'),'');
  assert.deepEqual(prepareReviewedAssets({root:dir,shard:'2/2',env:{...process.env,CI_LFS_TOKEN:''}}),{status:'not-needed',shard:'2/2'});
  const f=fixture(t);
  for(const p of expectedPaths) writeFileSync(join(f.dir,p),f.bytes.get(p));
  assert.equal(fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}).status,'cached');
});

test('actual git lfs pull materializes six objects offline, leaves unrelated future LFS data untouched, and then reuses them', t => {
  const f=fixture(t);
  // pull scans the current index; unlike fetch it does not apply these recent
  // history defaults. The unrelated object's local cache is deliberately absent.
  for(const [key,value] of [['lfs.fetchrecentalways','true'],['lfs.fetchrecentrefsdays','9999'],['lfs.fetchrecentcommitsdays','9999']]) git(f.dir,'config','--local',key,value);
  assert.throws(()=>fixtureLfs.verifyReviewedPngs(f.dir),/not the reviewed PNG/);
  assert.equal(fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}).status,'materialized');
  for(const p of expectedPaths) assert.deepEqual(readFileSync(join(f.dir,p)),f.bytes.get(p));
  assert.match(readFileSync(join(f.dir,f.extra),'utf8'),/^version https:\/\/git-lfs.github.com\/spec\/v1/);
  assert.equal(existsSync(f.object(f.extra)),false);
  assert.equal(fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}).status,'cached');
  writeFileSync(join(f.dir,expectedPaths[0]),'corrupted');
  assert.throws(()=>fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}),/not the reviewed PNG/);
});

test('a missing LFS object fails closed, and errors never echo the token or Git authorization header', t => {
  const f=fixture(t); rmSync(f.object(expectedPaths[0]));
  assert.throws(()=>fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:'not-a-real-token'}}),error=> {
    assert.match(error.message,/LFS materialization failed/); assert.doesNotMatch(error.message,/not-a-real-token|AUTHORIZATION|eC1hY2Nlc3M/); return true;
  });
});

test('workflow contract rejects broader permissions, unconditional pulls, automatic LFS checkout, and missing skip-smudge', () => {
  // This is current transport safety, independent of any old workflow hash or matrix.
  const quality=readFileSync('.github/workflows/quality.yml','utf8').replaceAll('\r\n','\n');
  const licenses=readFileSync('.github/workflows/licenses.yml','utf8').replaceAll('\r\n','\n');
  workflowContract(quality,licenses);
  for(const mutate of [
    q=>q.replace('contents: read','contents: write'),
    q=>q.replace('persist-credentials: false','persist-credentials: false\n          lfs: true'),
    q=>q.replace('persist-credentials: false','persist-credentials: true'),
    q=>q.replace('      - name: Materialize reviewed PNGs for this shard','      - uses: actions/cache@unreviewed\n      - name: Materialize reviewed PNGs for this shard'),
    q=>q.replace(' --prepare=${{ matrix.shard }}/${{ strategy.job-total }}',''),
    q=>q.replace("          GIT_LFS_SKIP_SMUDGE: '1'\n",''),
  ]){const changed=mutate(quality);assert.notEqual(changed,quality,'negative control must change current safety wiring');assert.throws(()=>workflowContract(changed,licenses));}
});

test('negative controls reject expanded include, retained token, omitted real PNG verification and unconditional materialization', async t => {
  async function mutant(before,after) { assert.ok(source.includes(before)); const dir=temp(t); const path=join(dir,'mutant.mjs'); writeFileSync(path,fixtureSource(source.replace(before,after))); return import(pathToFileURL(path).href); }
  const broad=await mutant("['source.png', 'preview-native.png']","['*.png', 'preview-native.png']");
  assert.ok(Array.isArray(broad.reviewedPngPaths));
  assert.notDeepEqual(broad.reviewedPngPaths,expectedPaths);
  const retained=await mutant('delete childEnv.CI_LFS_TOKEN;', '// token cleanup removed');
  assert.equal(retained.lfsEnvironment({CI_LFS_TOKEN:'not-a-real-token'}).CI_LFS_TOKEN,'not-a-real-token');
  const noVerify=await mutant('const verified = verifyReviewedPngs(root); // Required after pull, even when Git exits zero.', 'const verified = {}; // verification removed');
  const f=fixture(t); for(const p of expectedPaths) writeFileSync(join(f.dir,p),f.bytes.get(p)); writeFileSync(join(f.dir,expectedPaths[0]),'corrupted');
  assert.throws(()=>fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}), { code: 'ERR_REVIEWED_PNG' });
  // Call the actual mutant. A TypeError or a no-op mutation must fail this test,
  // not be mistaken for successful detection by nested assert.throws.
  assert.equal(noVerify.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}).status, 'materialized');
  assert.equal(readFileSync(join(f.dir,expectedPaths[0]), 'utf8'), 'corrupted');
  const unconditional=await mutant("if (!needsReviewedAssets(files, shard)) return { status: 'not-needed', shard };", '// shard guard removed');
  const dir=temp(t); git(dir,'init'); mkdirSync(join(dir,'tests')); writeFileSync(join(dir,'tests/reviewed-traveler-geo-assets.test.mjs'),'');
  assert.throws(()=>unconditional.prepareReviewedAssets({root:dir,shard:'2/2',env:{...process.env,CI_LFS_TOKEN:''}}), /Invalid reviewed LFS index pointer/);
});

function replaceIndexPointer(dir, path, pointer) {
  const r=spawnSync('git',['hash-object','-w','--stdin'],{cwd:dir,input:pointer,encoding:'utf8',windowsHide:true});
  assert.equal(r.status,0,r.stderr); git(dir,'update-index','--cacheinfo','100644',r.stdout.trim(),path);
}
test('frozen payload budget and OIDs reject oversized or changed pointers before any transfer', t => {
  assert.equal(lfs.maxReviewedPngBytes,5983528);
  const oversized=fixture(t), path=expectedPaths[0];
  const pointer=git(oversized.dir,'show',':'+path)+'\n';
  replaceIndexPointer(oversized.dir,path,pointer.replace(/size \d+/,'size 1073741824'));
  assert.throws(()=>fixtureLfs.prepareReviewedAssets({root:oversized.dir,env:{...process.env,CI_LFS_TOKEN:''}}),/payload exceeds.*5983528/);
  const changed=fixture(t);
  replaceIndexPointer(changed.dir,path,(git(changed.dir,'show',':'+path)+'\n').replace(/oid sha256:[0-9a-f]{64}/,'oid sha256:'+'0'.repeat(64)));
  assert.throws(()=>fixtureLfs.prepareReviewedAssets({root:changed.dir,env:{...process.env,CI_LFS_TOKEN:''}}),/does not match the frozen reviewed object/);
  for(const p of expectedPaths) writeFileSync(join(changed.dir,p),changed.bytes.get(p));
  assert.throws(()=>fixtureLfs.prepareReviewedAssets({root:changed.dir,env:{...process.env,CI_LFS_TOKEN:''}}),/does not match the frozen reviewed object/, 'cache hits cannot bypass index pointer validation');
});

test('a fresh runner with empty LFS filter configuration still materializes without persisting configuration', t => {
  const f=fixture(t);
  for(const key of ['clean','smudge','process']) git(f.dir,'config','--local',`filter.lfs.${key}`,'');
  git(f.dir,'config','--local','filter.lfs.required','false');
  const before=readFileSync(join(f.dir,'.git/config'));
  assert.equal(fixtureLfs.prepareReviewedAssets({root:f.dir,env:{...process.env,CI_LFS_TOKEN:''}}).status,'materialized');
  assert.deepEqual(readFileSync(join(f.dir,'.git/config')),before,'command-only filters never persist in Git config');
});


test('current reviewed PNG budget includes the identity-repair pair, not archived Heavy objects', () => {
  assert.equal(reviewedPngPaths.length, 6);
  assert.equal(lfs.maxReviewedPngBytes, 5983528);
  assert.equal(lfs.frozenObjects.reduce((sum, row) => sum + row[1], 0), lfs.maxReviewedPngBytes);
  assert.ok(!lfs.frozenObjects.some(([sha]) => sha === 'f396062d29b6845b58bf0043c1941a2219d9ca501ae6520c8579d555d73008d5'));
});

test('state evidence storage extension freezes all aliases and leaves the original media contract unchanged',()=>{
 const manifest=JSON.parse(readFileSync('config/ci-media-lfs.json','utf8'));
 const extension=manifest.evidenceExtension;
 assert(extension,'the state evidence extension must be explicit');
 assert.equal(extension.sourceCommit,'f34723b6d54b6153de8a333a8abcc77884737f8f');
 assert.equal(extension.maxPayloadBytes,37495268);
 assert.equal(extension.files.length,76);
 assert.equal(new Set(extension.files.map(row=>row.sha256)).size,58);
 assert.equal(extension.files.filter(row=>row.path.includes('/inspection-')).length,18);
 const original={...manifest};delete original.evidenceExtension;delete original.archiveExtension;
 assert.equal(createHash('sha256').update(JSON.stringify(original,null,2)+'\n').digest('hex'),'732a8b8b64611a2a3f714bf41a7c2bc1f458b1a6f9dfb86f5d37d0dc0c3a715a','all original manifest records, categories, OIDs and budget are byte-preserved');
 const ids=new Set(extension.files.flatMap(row=>row.oldBinaryGitBlobs));assert.equal(ids.size,58);
 const ledger=JSON.parse(readFileSync('docs/legal/assets.json','utf8'));
 assert.equal(sensitive('docs/evidence/foreign/unregistered.json.gz'),false,'the license scope does not permit arbitrary gzip');
 for(const row of extension.files){
  assert.match(row.path,/^docs\/evidence\/.+\.json\.gz$/);
  assert(!row.path.startsWith('tests/helpers/'));
  assert.equal(row.sourceCommit,extension.sourceCommit);
  const bytes=readFileSync(row.path);
  assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  assert.deepEqual(row.oldBinaryGitBlobs,[createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')]);
  assert(sensitive(row.path),'registered evidence is never skipped because of its gzip extension');
  assert.deepEqual(checkAssets(root,[row.path],{categories:ledger.categories,files:{[row.path]:ledger.files[row.path]}}),[]);
 }
});

test('existing media pointers retain their exact original ledger identities and separate bounded payload',()=>{
 const ledger=JSON.parse(readFileSync('docs/legal/assets.json','utf8'));
 const pointers=new Map(mediaFiles.map(row=>[row.path,mediaPointer(row)]));
 assert.equal(originalMediaFiles.length,738);assert.equal(new Set(originalMediaFiles.map(row=>row.sha256)).size,705);
 assert.equal([...new Map(originalMediaFiles.map(row=>[row.sha256,row.bytes])).values()].reduce((a,b)=>a+b,0),117369505);
 assert.deepEqual(validateMediaPointers(pointers),{files:817,objects:766,bytes:161448848});
 assert.equal(maxMediaPayloadBytes,117369505);assert.equal(maxEvidencePayloadBytes,37495268);assert.equal(lfs.maxReviewedPngBytes,5983528);
 for(const row of mediaFiles){const entry=ledger.files[row.path];assert.equal(entry.sha256,row.sha256);assert.equal(entry.bytes,row.bytes);assert.equal(entry.category,row.category);assert.equal(entry.storage,'ci-media-lfs-v1');}
 const first=mediaFiles[0],wrong=new Map(pointers);wrong.set(first.path,Buffer.from(mediaPointer(first).toString().replace(first.sha256,'0'.repeat(64))));
 assert.throws(()=>validateMediaPointers(wrong),/frozen media index pointer/);
 const large=new Map(pointers);large.set(first.path,mediaPointer({...first,bytes:first.bytes+1}));assert.throws(()=>validateMediaPointers(large),/frozen media index pointer/);
 const missing=new Map(pointers);missing.delete(first.path);assert.throws(()=>validateMediaPointers(missing),/complete media pointer inventory/);
 const extra=new Map(pointers);extra.set('foreign.png',mediaPointer(first));assert.throws(()=>validateMediaPointers(extra),/complete media pointer inventory/);
});

test('complete existing media are freshly authenticated on a cache hit without a transfer token',()=>{
 assert.deepEqual(prepareMediaAssets({env:{...process.env,CI_LFS_TOKEN:''}}),{status:'cached',files:817,objects:766,bytes:161448848});
});

test('three existing CI archives retain complete bytes and original Git blob identities under exact storage',()=>{
 assert.equal(archiveFiles.length,3);assert.equal(maxArchivePayloadBytes,6584075);
 assert.equal(archiveFiles.reduce((total,row)=>total+row.bytes,0),maxArchivePayloadBytes);
 for(const row of archiveFiles){
  assert.equal(row.sourceCommit,'9f2f44e4c79789fbcb64a515938765dbc240f830');
  const bytes=readFileSync(row.path);
  assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);
  assert.deepEqual(row.oldBinaryGitBlobs,[createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')]);
  assert(sensitive(row.path));
 }
 assert.equal(sensitive('docs/evidence/foreign/unregistered.tar.gz'),false);
 assert.equal(maxMediaPayloadBytes,117369505);assert.equal(maxEvidencePayloadBytes,37495268);
});

test('cold partial checkout checks all text and exact media pointers without downloading old binary',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'media-ws-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const source=join(directory,'source'),clone=join(directory,'clone');mkdirSync(source);
 const env={...process.env,CI_COMPARISON_BASE:'',GIT_LFS_SKIP_SMUDGE:'1',GIT_TERMINAL_PROMPT:'0',GIT_NO_LAZY_FETCH:'1'};
 const run=(cwd,args,input,extra={})=>{const result=spawnSync('git',args,{cwd,input,env:{...env,...extra},encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:8*1024*1024});assert.equal(result.status,0,result.stdout+result.stderr);return result.stdout.trim();};
 run(source,['init']);run(source,['config','user.name','Media CI fixture']);run(source,['config','user.email','media@example.invalid']);run(source,['config','core.longpaths','true']);run(source,['config','uploadpack.allowFilter','true']);run(source,['config','uploadpack.allowAnySHA1InWant','true']);
 for(const row of mediaFiles){const path=join(source,row.path);mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,mediaPointer(row));}
 writeFileSync(join(source,'.gitattributes'),readFileSync('.gitattributes'));writeFileSync(join(source,'source.txt'),'before\n');
 run(source,['add','--force','.']);
 const small=mediaFiles.find(row=>row.path==='art/cards/shared/type-attack.png');
 const original=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAgUlEQVR4nO3XsQnDMAAF0dNN4p1SZMYU2cmbJBO4MCj4iPx6CXGg4sNq9vfrM/M+ifMX9faJFfMFx4xL9oNi2+M5/r6gxEmcxEmcxEmcxEmcxEmcxEmcxEmcxEmcxI2zB2YMou3EFMgXlDiJkxV28dHnuXdxgcRJnMRJnFc/4La8LwVtFeMzsF6fAAAAAElFTkSuQmCC','base64');
 assert.equal(createHash('sha256').update(original).digest('hex'),small.sha256);assert(original.subarray(0,8000).includes(0));
 const old=run(source,['hash-object','-w','--stdin'],original);assert(small.oldBinaryGitBlobs.includes(old));
 run(source,['update-index','--cacheinfo','100644,'+old+','+small.path]);
 // Every f347 raw state object and alias is a real parent-tree entry. The
 // append-only pointer commit must avoid downloading all of them, not only PNGs.
 const originalEvidence=run(source,['hash-object','-w','--no-filters','--stdin-paths'],evidenceFiles.map(row=>JSON.stringify(resolve(root,row.path))).join('\n')+'\n').split('\n');
 assert.equal(originalEvidence.length,evidenceFiles.length);
 for(const [i,row]of evidenceFiles.entries())assert.deepEqual(row.oldBinaryGitBlobs,[originalEvidence[i]]);
 run(source,['update-index','--index-info'],evidenceFiles.map((row,i)=>'100644 '+originalEvidence[i]+'\t'+row.path).join('\n')+'\n');
 run(source,['commit','-m','binary baseline']);const base=run(source,['rev-parse','HEAD']);
 writeFileSync(join(source,'source.txt'),'after\n');run(source,['add','.']);run(source,['commit','-m','pointer candidate']);const head=run(source,['rev-parse','HEAD']);
 run(directory,['clone','--no-checkout','--filter=blob:none','--depth=2',pathToFileURL(source).href,clone]);run(clone,['config','core.longpaths','true']);
 // Match the real pre-guard checkout: materialize HEAD first. Every subsequent
 // operation inherits the explicit no-lazy-fetch setting, including local runs.
 run(clone,['checkout','--detach','HEAD'],undefined,{GIT_NO_LAZY_FETCH:'0'});run(clone,['config','user.name','Media CI fixture']);run(clone,['config','user.email','media@example.invalid']);
 const prepared=prepareComparisonBlobs({root:clone,env:{...env,CI_COMPARISON_TOKEN:'local-fixture'}});assert.equal(prepared.parents[0],base);assert(prepared.fetched>0&&prepared.bytes<8*1024*1024);
 const oldObjects=[...new Set([old,...originalEvidence])];
 const absent=()=>run(clone,['cat-file','--batch-check'],oldObjects.join('\n')+'\n',{GIT_NO_LAZY_FETCH:'1'});
 const assertAbsent=()=>{const rows=absent().split('\n');assert.equal(rows.length,oldObjects.length);for(const row of rows)assert.match(row,/ missing$/);};assertAbsent();
 const measured=()=>checkHostedCheckout({cwd:clone,sha:head,summary:join(directory,'summary'),log(){}});
 const packBytes=measured();assert(packBytes<128*1024*1024);
 assert.equal(checkWhitespace({root:clone,base,head}).status,'pass');assertAbsent();assert.equal(measured(),packBytes,'whitespace cannot add unmeasured packs');
 const decode=ref=>new Map(run(clone,['ls-tree','-rz',ref]).split('\0').filter(Boolean).map(line=>{const [meta,path]=line.split('\t');const [mode,,oid]=meta.split(' ');return [path,{mode,oid}];}));
 const before=decode(base),after=decode(head),badBefore=new Map(before);badBefore.set(small.path,{mode:'100644',oid:mediaFiles.find(row=>!row.oldBinaryGitBlobs.includes(old)).oldBinaryGitBlobs[0]});assert.throws(()=>validateMediaBases(badBefore,after),/unknown old media/);
 const badAfter=new Map(after);badAfter.set(small.path,{...after.get(small.path),mode:'120000'});assert.throws(()=>validateMediaBases(before,badAfter),/ordinary current media pointer/);
 run(clone,['update-index','--cacheinfo','120000,'+after.get(small.path).oid+','+small.path]);assert.throws(()=>prepareMediaAssets({root:clone,env}),/ordinary media index mode/);run(clone,['update-index','--cacheinfo','100644,'+after.get(small.path).oid+','+small.path]);
 writeFileSync(join(clone,small.path),Buffer.alloc(small.bytes));assert.throws(()=>prepareMediaAssets({root:clone,env}),/changed media content/);writeFileSync(join(clone,small.path),mediaPointer(small));
 const state=evidenceFiles[0];writeFileSync(join(clone,state.path),Buffer.alloc(state.bytes));assert.throws(()=>prepareMediaAssets({root:clone,env}),/changed media content/);writeFileSync(join(clone,state.path),mediaPointer(state));
 const foreignGzip='docs/evidence/foreign/inspection-unregistered.json.gz';
 assert.deepEqual(comparisonBlobIds('100644 blob '+'1'.repeat(40)+'\t'+foreignGzip+'\n'),['1'.repeat(40)],'unknown gzip is still a required comparison source');
 writeFileSync(join(clone,'.gitattributes'),readFileSync(join(clone,'.gitattributes'),'utf8')+'\nsource.txt ci-immutable-media\n');assert.throws(()=>checkWhitespace({root:clone,base,head}),/exact media-only attribute scope/);run(clone,['checkout','--','.gitattributes']);
 writeFileSync(join(clone,'.git/info/attributes'),'source.txt ci-immutable-media\n');assert.throws(()=>checkWhitespace({root:clone,base,head}),/exact media-only attribute scope/);writeFileSync(join(clone,'.git/info/attributes'),'');
 run(source,['checkout','--detach',base]);writeFileSync(join(source,'.gitattributes'),readFileSync(join(source,'.gitattributes'),'utf8')+'\n'+small.path+' diff\n');run(source,['add','.gitattributes']);run(source,['commit','-m','forced text is not a binary exemption']);const forced=run(source,['rev-parse','HEAD']);
 prepareComparisonBlobs({root:clone,env:{...env,CI_COMPARISON_TOKEN:'local-fixture',CI_COMPARISON_BASE:forced}});assert.throws(()=>checkWhitespace({root:clone,base:forced,head}),/old media was never forced text/);assert.match(absent(),/ missing$/);
 writeFileSync(join(clone,'source.txt'),'bad trailing space \n');run(clone,['add','source.txt']);run(clone,['commit','-m','invalid whitespace']);assert.throws(()=>checkWhitespace({root:clone,base,head:run(clone,['rev-parse','HEAD'])}),/trailing whitespace/);
 assertAbsent();
});

test('comparison inventory includes all non-media parents and rejects malformed blob metadata',()=>{
 const id='1'.repeat(40),row=mediaFiles[0];
 assert.deepEqual(comparisonBlobIds('100644 blob '+id+'\tsrc/lua/module.lua\n100644 blob '+id+'\tconfig/architecture.json\n100644 blob '+'2'.repeat(40)+'\t'+row.path+'\n'),[id]);
 assert.throws(()=>comparisonBlobIds('100644 tree '+id+'\tsource.txt'),/ordinary comparison source blob/);
});

test('pre-setup comparison metadata imports without optional Node24 glob support',()=>{
 const module=pathToFileURL(resolve('scripts/ci-comparison-blobs.mjs')).href;
 const script=`import fs from 'node:fs';import {syncBuiltinESMExports}from'node:module';fs.globSync=undefined;syncBuiltinESMExports();const m=await import(${JSON.stringify(module)});if(typeof m.prepareComparisonBlobs!=='function')throw Error('missing metadata entry');console.log('NO_GLOB_METADATA_OK');`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:root,encoding:'utf8',windowsHide:true,timeout:30000});
 assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/NO_GLOB_METADATA_OK/);
 const quality=readFileSync('.github/workflows/quality.yml','utf8');const presentation=quality.split('\n  presentation:')[1].split('\n  engineering-posix-shards:')[0];
 assert.match(presentation,/node-version: '24\.18\.0'/);assert(presentation.indexOf('actions/setup-node@')<presentation.indexOf('node scripts/ci-media-lfs.mjs'));
});
