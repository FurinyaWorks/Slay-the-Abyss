// Formal archive writer; source/closure edits are emitted as an apply_patch patch.
// Run --write-archive only after reviewing the four live owners, then apply the
// printed patch. --check is read-only and rejects stale or unregistered bytes.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createSourceEpochProjector} from './combined-epoch/source-epoch-runtime.mjs';
const base='903bf2a31e91f10fb24763ab4cea23d586d0bb83';
const paths=['src/lua/abyss_deck_ui.lua','src/lua/abyss_merchant.lua','src/lua/abyss_game_ui_input.lua','src/lua/abyss_node_ui_feedback.lua'];
const normalize=s=>s.replaceAll('\r\n','\n'),hash=b=>createHash('sha256').update(b).digest('hex');
const blob=source=>createHash('sha1').update(`blob ${Buffer.byteLength(source)}\0`).update(source).digest('hex');
const binding=source=>({source,sha256:hash(source),gitBlob:blob(source)});
const defaultRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
function readPrior(root){
 const bytes=readFileSync(join(root,'tests/helpers/closeout-source-epoch.json.gz'));
 assert.equal(hash(bytes),'36aba7fc07f732a191a750d437eefd27e9b9567221811747abf13c97a9ac237a','immutable closeout predecessor');
 const packed=JSON.parse(gunzipSync(bytes)),expand=files=>Object.fromEntries(Object.entries(files).map(([p,id])=>[p,id===null?null:packed.records[id]]));
 return expand(packed.current);
}
function requireGitPredecessor(root,prior){
 const gitFiles=Object.fromEntries(execFileSync('git',['ls-tree','-r','--format=%(path) %(objectname)',base,'--','config/architecture.json','src/lua'],{cwd:root,encoding:'utf8'}).trim().split('\n').map(line=>line.split(' ')).filter(([p])=>p==='config/architecture.json'||p.endsWith('.lua')));
 assert.deepEqual(Object.keys(gitFiles).sort(),Object.keys(prior).sort(),'complete 903bf2a31 predecessor inventory');
 for(const [p,row]of Object.entries(prior))assert.equal(blob(row.source),gitFiles[p],'complete 903bf2a31 predecessor source: '+p);
}
export function collectShopDeckSourceEpoch({root=defaultRoot,readSource=p=>readFileSync(join(root,p),'utf8')}={}){
 const prior=readPrior(root);
 const inventory=()=>['config/architecture.json',...readdirSync(join(root,'src/lua')).filter(p=>p.endsWith('.lua')).map(p=>'src/lua/'+p)].sort();
 assert.deepEqual(inventory(),Object.keys(prior).sort(),'complete current source inventory');
 const collected={};
 for(const [p,row]of Object.entries(prior)){
  const source=readSource(p);assert.equal(typeof source,'string','current source required: '+p);
  collected[p]=normalize(source);
  if(!paths.includes(p))assert.equal(hash(collected[p]),row.sha256,'unlisted current source drift: '+p);
 }
 const current=Object.fromEntries(paths.map(p=>[p,binding(collected[p])]));
 const before=Object.fromEntries(paths.map(p=>[p,prior[p]]));
 const proof={schemaVersion:1,normalization:'LF',currentCommit:base,currentTreeCommitted:false,
  currentCommitRole:'exact working shop/deck/map source slice collected on 903bf2a31; not a committed historical corpus',
  owners:paths.filter(p=>current[p].sha256!==before[p].sha256),current,targets:{prior:{commit:base,files:before}}};
 createSourceEpochProjector(proof);
 assert.deepEqual(inventory(),Object.keys(prior).sort(),'source inventory changed during collection');
 for(const [p,source]of Object.entries(collected)){
  const fresh=readSource(p);assert.equal(typeof fresh,'string','current source required: '+p);
  assert.equal(hash(normalize(fresh)),hash(source),'source changed during collection: '+p);
 }
 return proof;
}
function patchFile(path,before,after){
 if(before===after)return '';
 const a=before.trimEnd().split('\n'),b=after.trimEnd().split('\n');let start=0,end=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
 return `*** Update File: ${path}\n@@\n`+(start?' '+a[start-1]+'\n':'')+
  a.slice(start,a.length-end).map(s=>'-'+s+'\n').join('')+b.slice(start,b.length-end).map(s=>'+'+s+'\n').join('')+(end?' '+a[a.length-end]+'\n':'');
}
export function shopDeckRebind({root=defaultRoot,writeArchive=false}={}){
 requireGitPredecessor(root,readPrior(root));
 const proof=collectShopDeckSourceEpoch({root});
 const archive=gzipSync(Buffer.from(JSON.stringify(proof)),{level:9});
 const archivePath='tests/helpers/shop-deck-source-epoch.json.gz',epochPath='tests/helpers/closeout-source-epoch.mjs';
 const closurePath='tests/helpers/closeout-source-closure.json',copyPath='tests/helpers/copy-integration-source-closure.mjs';
 const read=p=>normalize(readFileSync(join(root,p),'utf8'));
 const epoch=read(epochPath),nextEpoch=epoch.replace(/assert\.equal\(hash\(shopBytes\),'[^']*'/,`assert.equal(hash(shopBytes),'${hash(archive)}'`);
 assert.notEqual(epoch.indexOf('assert.equal(hash(shopBytes),'),-1,'fixed archive guard');
 const closure=read(closurePath),files=JSON.parse(closure);
 const registeredEpoch=files[epochPath];
 files[epochPath]=hash(nextEpoch);files[archivePath]=hash(archive);
 const nextClosure=JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0)),null,2)+'\n';
 const copy=read(copyPath),oldClosureHash=hash(Buffer.from(closure));
 assert(copy.includes(oldClosureHash),'authenticated current closure guard');
 const nextCopy=copy.replace(oldClosureHash,hash(nextClosure));
 const epochClosure=closure.replace(`"${epochPath}": "${registeredEpoch}"`,`"${epochPath}": "${hash(nextEpoch)}"`);
 const first=patchFile(closurePath,closure,epochClosure),second=patchFile(closurePath,epochClosure,nextClosure);
 const closureEdits=first?first+second.replace(`*** Update File: ${closurePath}\n`,''):second;
 const edits=patchFile(epochPath,epoch,nextEpoch)+closureEdits+patchFile(copyPath,copy,nextCopy);
 if(writeArchive)writeFileSync(join(root,archivePath),archive);
 else{
  assert.deepEqual(readFileSync(join(root,archivePath)),archive,'stale shop/deck archive; collect reviewed final sources again');
  assert.equal(edits,'','apply the generated source/closure patch');
 }
 return {archiveSha256:hash(archive),sourceSha256:Object.fromEntries(paths.map(p=>[p,proof.current[p].sha256])),
  changedPaths:proof.owners,patch:edits?'*** Begin Patch\n'+edits+'*** End Patch':''};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert.equal(process.argv.length,3,'use --check or --write-archive');
 assert(['--check','--write-archive'].includes(process.argv[2]),'use --check or --write-archive');
 const {patch,...receipt}=shopDeckRebind({writeArchive:process.argv[2]==='--write-archive'});
 console.log(JSON.stringify(receipt,null,2));if(patch)console.log(patch);
}
