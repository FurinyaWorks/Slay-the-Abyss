// A blob-filtered depth-two checkout keeps parent identity without downloading
// historical media. Prefetch every other missing comparison blob before the
// byte guard; a later whitespace or quality check must not lazily fetch inputs.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {appendFileSync} from 'node:fs';
import {mediaByPath} from './ci-media-lfs.mjs';
const sha=/^[0-9a-f]{40}$/;
function git(root,args,input,env=process.env){
 const result=spawnSync('git',args,{cwd:root,input,env:{...env,GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'},encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:8*1024*1024});
 if(result.error||result.status!==0)throw Error('Comparison Git operation failed: '+args[0]);return result.stdout;
}
function fetchComparison(root,refspecs,env,{metadata=false}={}){
 const child={...env};delete child.CI_COMPARISON_TOKEN;delete child.CI_LFS_TOKEN;
 child.GIT_CONFIG_COUNT='1';child.GIT_CONFIG_KEY_0='http.https://github.com/.extraheader';
 assert(typeof env.CI_COMPARISON_TOKEN==='string'&&env.CI_COMPARISON_TOKEN,'read-only comparison token required');
 child.GIT_CONFIG_VALUE_0='AUTHORIZATION: basic '+Buffer.from('x-access-token:'+env.CI_COMPARISON_TOKEN).toString('base64');
 git(root,['-c','credential.helper=','-c','fetch.unpackLimit=1','-c','http.lowSpeedLimit=1024','-c','http.lowSpeedTime=30','fetch','--no-auto-maintenance','--no-write-fetch-head','--no-tags','--filter=blob:none',...(metadata?['--depth=1']:[]),'--stdin','origin'],refspecs.join('\n')+'\n',child);
}
export function comparisonBlobIds(listing){
 const records=listing.trim().split('\n').filter(Boolean).map(line=>{
  if(/^160000 commit [0-9a-f]{40}\t/.test(line))return null;
  const match=/^(?:100644|100755|120000) blob ([0-9a-f]{40})\t(.+)$/.exec(line);assert(match,'ordinary comparison source blob');
  return mediaByPath.has(match[2])?null:match[1];
 }).filter(Boolean);
 assert(records.length>0&&records.length<=32768,'bounded complete comparison source count');return [...new Set(records)];
}
export function prepareComparisonBlobs({root=process.cwd(),env=process.env}={}){
 const parents=git(root,['cat-file','-p','HEAD']).split('\n').filter(line=>line.startsWith('parent ')).map(line=>line.slice(7));
 assert(parents.length>0&&parents.length<=2&&parents.every(p=>sha.test(p)),'exact supported checkout parents');
 const comparisons=[...parents],base=env.CI_COMPARISON_BASE;
 if(base&&!/^0+$/.test(base)){
  assert(sha.test(base),'exact comparison base');
  if(!parents.includes(base)){
   const probe=spawnSync('git',['cat-file','-e',base+'^{commit}'],{cwd:root,env:{...env,GIT_NO_LAZY_FETCH:'1'},windowsHide:true,timeout:10000});
   if(probe.error||probe.status!==0)fetchComparison(root,[base],env,{metadata:true});
   comparisons.push(base);
  }
 }
 const ids=new Set();for(const parent of comparisons)for(const id of comparisonBlobIds(git(root,['-c','core.quotePath=false','ls-tree','-r',parent])))ids.add(id);
 const input=[...ids].join('\n')+'\n';
 const states=git(root,['cat-file','--batch-check'],input).trim().split('\n');assert.equal(states.length,ids.size);
 const missing=states.filter(line=>line.endsWith(' missing')).map(line=>line.split(' ')[0]);
 if(missing.length)fetchComparison(root,missing,env);
 const complete=git(root,['cat-file','--batch-check'],input).trim().split('\n');let bytes=0;
 for(const line of complete){const match=/^([0-9a-f]{40}) blob ([0-9]+)$/.exec(line);assert(match,'complete comparison blob present without lazy fetch');if(missing.includes(match[1]))bytes+=Number(match[2]);}
 assert(bytes<=8*1024*1024,'bounded complete missing comparison source payload');return {parents,base:base??null,objects:ids.size,fetched:missing.length,bytes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{console.log(JSON.stringify(prepareComparisonBlobs()));assert(process.env.GITHUB_ENV,'GitHub environment destination required');appendFileSync(process.env.GITHUB_ENV,'GIT_NO_LAZY_FETCH=1\n');}catch(error){console.error(error.message);process.exitCode=1;}}
