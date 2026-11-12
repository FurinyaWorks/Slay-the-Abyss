// Original text whitespace check, plus stricter complete LFS pointer identities
// for precisely frozen media that were binary under their original attributes.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {mediaFiles,mediaByPath,mediaPointer,validateMediaIndex} from './ci-media-lfs.mjs';
const sha=/^[0-9a-f]{40}$/;
const pointerBlob=row=>{const value=mediaPointer(row);return createHash('sha1').update(`blob ${value.length}\0`).update(value).digest('hex');};
function git(root,args,input){
 const result=spawnSync('git',args,{cwd:root,input,encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_TERMINAL_PROMPT:'0'},timeout:30000,windowsHide:true,maxBuffer:8*1024*1024});
 if(result.error||result.status!==0)throw Error('Whitespace Git operation failed: '+args[0]+'\n'+(result.stdout??'')+(result.stderr??''));return result.stdout;
}
function tree(root,ref){
 const rows=git(root,['ls-tree','-rz',ref]).split('\0').filter(Boolean).map(line=>{const m=/^(\d+) (blob|commit) ([0-9a-f]{40})\t(.+)$/.exec(line);assert(m,'exact comparison tree');return [m[4],{mode:m[1],oid:m[3]}];});return new Map(rows);
}
export function validateMediaBases(before,after){
 for(const row of mediaFiles){
  const current=after.get(row.path),prior=before.get(row.path),pointer=pointerBlob(row);
  assert(current&&current.mode==='100644'&&current.oid===pointer,'exact ordinary current media pointer: '+row.path);
  if(prior)assert(prior.mode==='100644'&&(prior.oid===pointer||row.oldBinaryGitBlobs.includes(prior.oid)),'unknown old media is never excluded: '+row.path);
 }
}
function attributes(root,paths,args,attribute){
 const parts=git(root,['check-attr',...args,'-z','--stdin',attribute],paths.join('\0')+'\0').split('\0');assert.equal(parts.pop(),'');assert.equal(parts.length,paths.length*3);
 return paths.map((path,i)=>{assert.equal(parts[i*3],path);assert.equal(parts[i*3+1],attribute);return parts[i*3+2];});
}
export function checkWhitespace({root=process.cwd(),base,head}={}){
 assert(sha.test(base)&&sha.test(head),'exact whitespace comparison SHAs');assert.equal(git(root,['rev-parse','HEAD']).trim(),head,'exact current whitespace HEAD');
 const before=tree(root,base),after=tree(root,head);validateMediaBases(before,after);validateMediaIndex(root);
 const paths=[...new Set([...before.keys(),...after.keys(),...git(root,['ls-files','-z']).split('\0').filter(Boolean)])].sort();
 for(const args of [[],['--cached']]){
  const attrs=attributes(root,paths,args,'ci-immutable-media');
  for(let i=0;i<paths.length;i++)assert(mediaByPath.has(paths[i])?attrs[i]==='set':['unspecified','unset'].includes(attrs[i]),'exact media-only attribute scope: '+paths[i]);
 }
 const mediaPaths=mediaFiles.map(row=>row.path);
 const oldDiff=attributes(root,mediaPaths,['--source='+base],'diff');
 for(let i=0;i<mediaFiles.length;i++){
  const row=mediaFiles[i],prior=before.get(row.path);
  if(prior&&prior.oid!==pointerBlob(row))assert(['unspecified','unset'].includes(oldDiff[i]),'old media was never forced text: '+row.path);
 }
 // Exclusion is equivalent only after the path-specific binary and complete
 // pointer checks above. All original text/rename whitespace semantics remain.
 git(root,['diff','--check',base,head,'--','.',':(exclude,attr:ci-immutable-media)']);
 return {status:'pass',base,head,authenticatedBinaryPaths:mediaFiles.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{assert.equal(process.argv.length,4);console.log(JSON.stringify(checkWhitespace({base:process.argv[2],head:process.argv[3]})));}catch(error){console.error(error.message);process.exitCode=1;}}
