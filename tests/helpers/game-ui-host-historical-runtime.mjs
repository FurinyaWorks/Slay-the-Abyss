// Historical monolith -> extracted Host proof, never a current-production replay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {stsStylePriorRuntime} from './sts-style-prior-runtime.mjs';

let historical;
export function historicalHostRuntime(){
 if(historical)return historical;
 const root=process.cwd(),dir=fs.mkdtempSync(path.join(os.tmpdir(),'abyss-host-history-base-'));
 for(const [name,row]of Object.entries(stsStylePriorRuntime.files)){
  assert(!path.isAbsolute(name)&&!name.split('/').includes('..'),'fixed historical runtime path');
  const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,row.source);
 }
 for(const name of ['art','node_modules','tests/helpers','tests/fixtures']){
  fs.mkdirSync(path.dirname(path.join(dir,name)),{recursive:true});
  fs.symlinkSync(path.join(root,name),path.join(dir,name),process.platform==='win32'?'junction':'dir');
 }
 console.log('HISTORICAL_HOST_REFACTOR exact complete runtime '+stsStylePriorRuntime.baseCommit+'; current production is checked separately');
 for(const builder of ['build-lua-data.mjs','build-ui.mjs','build-ui-theme.mjs']){
  const result=spawnSync(process.execPath,['scripts/'+builder],{cwd:dir,encoding:'utf8',timeout:30000,windowsHide:true});
  assert.ifError(result.error);assert.equal(result.status,0,result.stdout+result.stderr);
 }
 historical=dir;
 process.once('exit',()=>{
  const actual=fs.realpathSync(dir),parent=fs.realpathSync(os.tmpdir());
  assert.equal(path.dirname(actual),parent);assert(path.basename(actual).startsWith('abyss-host-history-base-'));
  assert(!fs.lstatSync(dir).isSymbolicLink());fs.rmSync(actual,{recursive:true,force:true});
 });
 return historical;
}
