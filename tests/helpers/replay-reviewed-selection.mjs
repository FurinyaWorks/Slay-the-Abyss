import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,copyFileSync,cpSync,symlinkSync,realpathSync} from 'node:fs';
import {join,dirname,resolve,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {sourceEpoch} from './closeout-source-epoch.mjs';
import {integratedCiProof,assertIntegratedCurrent} from './integrated-ci-source.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex'),norm=s=>s.replaceAll('\r\n','\n');
export function replayReviewedSelection(){
 const script='tests/sts-character-reference.test.mjs',root=process.cwd();
 assertIntegratedCurrent();
 for(const [path,row]of Object.entries(sourceEpoch.proof.current))
  assert.equal(hash(norm(readFileSync(path,'utf8'))),row.sha256,'fresh current production owner: '+path);
 assert.equal(integratedCiProof.sources.release,'900527d931df941eed642a9667ccde92f76b73db');
 const original=integratedCiProof.files[script].views.release;assert(original,'complete original selection contract');
 const directory=mkdtempSync(join(tmpdir(),'abyss-reviewed-selection-'));
 const started=Date.now(),remaining=()=>{const ms=60000-(Date.now()-started);assert(ms>0,'original selection replay deadline');return ms;};
 try{
  const paths=execFileSync('git',['ls-files','scripts','data','config','tools','tests/helpers'],{encoding:'utf8'}).trim().split('\n');
  for(const path of paths){assert(!isAbsolute(path)&&!path.split('/').includes('..'));const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(path,target);}
  cpSync(join(root,'tests/fixtures'),join(directory,'tests/fixtures'),{recursive:true});
  for(const [path,row]of Object.entries(integratedCiProof.files)){
   if(!row.views.release||path.startsWith('src/'))continue;
   const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,row.views.release.source);
  }
  for(const [path,row]of Object.entries(sourceEpoch.proof.targets.releaseReviewed.files)){
   if(!row)continue;const target=join(directory,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,row.source);
  }
  for(const path of ['art','node_modules']){
   mkdirSync(dirname(join(directory,path)),{recursive:true});symlinkSync(join(root,path),join(directory,path),process.platform==='win32'?'junction':'dir');
  }
  const target=join(directory,script);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,original.source);
  assert.equal(hash(readFileSync(target)),original.sha256,'unaltered complete historical assertions');
  const env={...process.env};delete env.NODE_TEST_CONTEXT;
  const result=spawnSync(process.execPath,['--test','--test-reporter=tap',script],{cwd:directory,encoding:'utf8',timeout:remaining(),maxBuffer:4*1024*1024,windowsHide:true,env});
  assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/^# tests 5$/m,'all five original selection contracts execute');
  assert.match(result.stdout,/^# pass 5$/m);assert.match(result.stdout,/^# fail 0$/m);assert.match(result.stdout,/^# skipped 0$/m);
  return result.stdout;
 }finally{
  const actual=realpathSync(directory),within=relative(resolve(tmpdir()),actual);
  assert(within&&!isAbsolute(within)&&!within.startsWith('..')&&within.startsWith('abyss-reviewed-selection-'));
  rmSync(actual,{recursive:true,force:true});
 }
}
