import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {committedSources} from '/workspace/scratch/c1a4970a76e0/m7-quality-ratchet-review/scripts/check-quality-ratchet.mjs';
const dir=mkdtempSync('/tmp/ratchet-objects-'),cwd=process.cwd();
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
try{process.chdir(dir);git('init','-q');git('config','core.autocrlf','false');git('config','user.name','test');git('config','user.email','test@example.invalid');mkdirSync('src/lua',{recursive:true});
const source='--[[\r\n'+('a'.repeat(40))+' blob 100\n\u0000\n]]\nreturn "汉字"\n';
writeFileSync('src/lua/a.lua',source);writeFileSync('src/lua/b.lua',source);git('add','.');git('-c','commit.gpgsign=false','commit','-qm','fixture');
assert.deepEqual(committedSources(git('rev-parse','HEAD')),{'src/lua/a.lua':source,'src/lua/b.lua':source});console.log('PASS byte-sized framing: repeated blob, apparent header, NUL, CRLF, UTF8');
writeFileSync('src/lua/a.lua',Buffer.from([0xff]));git('add','.');git('-c','commit.gpgsign=false','commit','-qm','invalid');assert.throws(()=>committedSources(git('rev-parse','HEAD')),/encoded data/);console.log('PASS invalid UTF8 fails closed');
const oid=git('rev-parse','HEAD:src/lua/b.lua');git('rm','-r','src/lua');git('update-index','--add','--cacheinfo','120000,'+oid+',src/lua');git('-c','commit.gpgsign=false','commit','-qm','link-root');assert.throws(()=>committedSources(git('rev-parse','HEAD')),/Unsupported committed source entry/);console.log('PASS source-root symlink fails closed');
}finally{process.chdir(cwd);rmSync(dir,{recursive:true,force:true});}
