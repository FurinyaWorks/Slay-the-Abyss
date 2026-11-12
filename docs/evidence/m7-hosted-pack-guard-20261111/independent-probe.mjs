import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,statSync,rmSync,symlinkSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {checkHostedCheckout,checkNetworkPolicy} from '../../scripts/check-network-policy.mjs';
const results={at:new Date().toISOString(),node:process.version,git:execFileSync('git',['--version'],{encoding:'utf8'}).trim()};
const wf=readFileSync('.github/workflows/quality.yml','utf8');
const base=execFileSync('git',['show','6a614fc82697750ddb408750e54f59f801c24f1e:.github/workflows/quality.yml'],{encoding:'utf8'});
const local=s=>s.match(/      - name: Check out exact revision with installed Git\r?\n[\s\S]*?(?=\r?\n      (?:- |#))/)[0];
assert.equal(local(wf),local(base)); results.selfHostedBodyIdentical=true;
results.sourceHashes=Object.fromEntries(['.github/workflows/quality.yml','scripts/check-network-policy.mjs','tests/ci-downloads.test.mjs'].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]));
results.preparationBindingNegativeControls=Object.fromEntries([
 ['removed',wf.replace('          EXECUTION_ENVIRONMENT: ${{ runner.environment }}\n','')],
 ['wrongValue',wf.replace('EXECUTION_ENVIRONMENT: ${{ runner.environment }}','EXECUTION_ENVIRONMENT: self-hosted')]
].map(([name,s])=>[name,checkNetworkPolicy(s)]));
const root=mkdtempSync(join(tmpdir(),'hosted-independent-review-'));
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
try {
 const source=join(root,'source'); mkdirSync(source); git(source,'init'); git(source,'config','user.name','offline'); git(source,'config','user.email','offline@example.invalid'); writeFileSync(join(source,'tiny'),'x'); git(source,'add','.'); git(source,'commit','-m','tiny'); const sha=git(source,'rev-parse','HEAD');
 results.smallFetch={};
 for (const retain of [false,true]) {
  const dest=join(root,retain?'retain':'default'); mkdirSync(dest); git(dest,'init');
  const env={...process.env}; delete env.GIT_CONFIG_COUNT;delete env.GIT_CONFIG_KEY_0;delete env.GIT_CONFIG_VALUE_0;
  if(retain) Object.assign(env,{GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'fetch.unpackLimit',GIT_CONFIG_VALUE_0:'1'});
  execFileSync('git',['-c','protocol.version=2','fetch','--no-tags','--prune','--no-recurse-submodules','--depth=2',pathToFileURL(source).href,sha],{cwd:dest,env,stdio:'pipe'});
  git(dest,'checkout','--detach','FETCH_HEAD');
  const dir=join(dest,'.git/objects/pack'); const packs=readdirSync(dir).filter(n=>n.endsWith('.pack'));
  results.smallFetch[retain?'retained':'default']={packs:packs.length,bytes:packs.reduce((n,p)=>n+statSync(join(dir,p)).size,0)};
  if (!retain) {assert.equal(packs.length,0);assert.throws(()=>checkHostedCheckout({cwd:dest,sha,summary:join(root,'summary'),log:()=>{}}),/no retained/);continue;}
  assert.equal(packs.length,1); const summary=join(root,'summary');const bytes=checkHostedCheckout({cwd:dest,sha,summary,log:()=>{}});assert.equal(bytes,results.smallFetch.retained.bytes);
  symlinkSync(join(dir,packs[0]),join(dir,'link.pack'));assert.throws(()=>checkHostedCheckout({cwd:dest,sha,summary,log:()=>{}}),/not a regular file/);rmSync(join(dir,'link.pack'));results.symlinkRejected=true;
  const cli=spawnSync(process.execPath,[resolve('scripts/check-network-policy.mjs'),'--hosted-checkout'],{cwd:dest,encoding:'utf8',env:{...process.env,GITHUB_SHA:sha,GITHUB_STEP_SUMMARY:root}});assert.equal(cli.status,1);assert.match(cli.stderr,/EISDIR|EPERM/);results.cliSummaryFailureNonzero=true;
 }
} finally {rmSync(root,{recursive:true,force:true});}
console.log(JSON.stringify(results,null,2));
