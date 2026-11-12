import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const repository=process.cwd(),root=mkdtempSync('/tmp/ratchet-pathspec-');
const git=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout;};
const put=(path,text)=>{mkdirSync(root+'/'+path.slice(0,path.lastIndexOf('/')),{recursive:true});writeFileSync(root+'/'+path,text);};
const commit=()=>{git('add','-A');git('-c','commit.gpgsign=false','commit','-qm','probe');return git('rev-parse','HEAD').trim();};
try{
git('init','-q');git('config','user.name','test');git('config','user.email','test@example.invalid');
put('src/lua/a.lua','return {}\n');put('src/lua/deep/old.lua','return {}\n');const base=commit();
put('src/lua/README.md','# docs\n');put('src/lua/deep/notes.txt','notes\n');const docs=commit();
const run=spawnSync(process.execPath,[repository+'/scripts/check-quality-ratchet.mjs','--base',base],{cwd:root,encoding:'utf8'});assert.equal(run.status,0,run.stderr);const receipt=JSON.parse(readFileSync(root+'/build/quality-ratchet.json','utf8'));assert.deepEqual(receipt.changedLua,[]);
put('src/lua/a.lua','return {changed=true}\n');rmSync(root+'/src/lua/deep/old.lua');put('src/lua/deep/further/new.lua','return {}\n');put('src/lua/.hidden.lua','return {}\n');put('src/lua/not.lua.txt','ignored\n');const head=commit();
const raw=git('diff','--name-status','--no-renames','-z',docs,head,'--',':(top,glob)src/lua/**/*.lua');
assert.deepEqual(raw.split('\0').filter(Boolean),['A','src/lua/.hidden.lua','M','src/lua/a.lua','A','src/lua/deep/further/new.lua','D','src/lua/deep/old.lua']);
const report={scope:'Final recursive Lua pathspec repair',noLuaReceipt:receipt,selectedChanges:raw.split('\0').filter(Boolean),sourceHashes:Object.fromEntries(['scripts/check-quality-ratchet.mjs','tests/quality-ratchet-policy.test.mjs'].map(f=>[f,createHash('sha256').update(readFileSync(repository+'/'+f)).digest('hex')])),conclusion:'verified'};console.log(JSON.stringify(report,null,2));
}finally{rmSync(root,{recursive:true,force:true});}
