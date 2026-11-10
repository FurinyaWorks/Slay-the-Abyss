import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,symlinkSync,writeFileSync,existsSync,realpathSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {inside,fileRecord,prepareOutputDirectory} from '../scripts/evidence-files.mjs';

function fixture(t){
 const base=mkdtempSync(join(tmpdir(),'abyss-native-junction-'));
 t.after(()=>rmSync(base,{recursive:true,force:true}));
 const root=join(base,'root'),outside=join(base,'outside');
 mkdirSync(root);mkdirSync(outside);
 return {base,root,outside};
}
function alias(t,target,path){
 try{symlinkSync(target,path,process.platform==='win32'?'junction':'dir');return true;}
 catch(error){
  if(['EPERM','EACCES'].includes(error.code)){t.skip('Directory alias creation requires filesystem privilege');return false;}
  throw error;
 }
}

test('physical external directory aliases are rejected by inside and fileRecord',t=>{
 const {root,outside}=fixture(t),escape=join(root,'escape');
 writeFileSync(join(outside,'secret.txt'),'external sentinel');
 if(!alias(t,outside,escape))return;
 // No isSymbolicLink gate: some Windows Global-target junctions report a directory.
 assert.equal(realpathSync.native(escape),realpathSync.native(outside));
 assert.throws(()=>inside(root,escape),/another root/);
 assert.throws(()=>fileRecord(join(escape,'secret.txt'),root),/another root/);
});

test('an external parent alias is rejected before any output directory is created',t=>{
 const {root,outside}=fixture(t),escape=join(root,'escape');
 if(!alias(t,outside,escape))return;
 assert.throws(()=>prepareOutputDirectory(root,join(escape,'new','nested')),/root|outside/i);
 assert.equal(existsSync(join(outside,'new')),false);
});

test('an internal directory alias resolves to the physical output and file identity',t=>{
 const {root}=fixture(t),target=join(root,'artifacts'),link=join(root,'alias');mkdirSync(target);
 writeFileSync(join(target,'candidate.gil'),'candidate payload');
 if(!alias(t,target,link))return;
 assert.equal(inside(root,link),realpathSync.native(target));
 assert.equal(fileRecord(join(link,'candidate.gil')).path,realpathSync.native(join(target,'candidate.gil')));
 assert.equal(prepareOutputDirectory(root,join(link,'nested')),realpathSync.native(join(target,'nested')));
});

test('an alias into a protected source directory cannot become an output path',t=>{
 const {root}=fixture(t),target=join(root,'src'),link=join(root,'alias');mkdirSync(target);
 if(!alias(t,target,link))return;
 assert.throws(()=>prepareOutputDirectory(root,join(link,'new')),/outside source paths/);
 assert.equal(existsSync(join(target,'new')),false);
});

test('a project root reached through an alias accepts its own physical descendants',t=>{
 const {base,root}=fixture(t),link=join(base,'root-alias'),target=join(root,'artifacts');mkdirSync(target);
 if(!alias(t,root,link))return;
 assert.equal(inside(link,target),realpathSync.native(target));
 assert.equal(prepareOutputDirectory(link,join(link,'artifacts','new')),realpathSync.native(join(target,'new')));
});
