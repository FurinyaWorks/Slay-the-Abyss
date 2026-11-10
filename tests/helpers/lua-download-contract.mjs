import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,unlinkSync,rmSync} from 'node:fs';
import {join,resolve,dirname,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Exercise the real installer and curl over loopback. No production config or
// external service is changed. Keep this in the existing runtime harness suite.
test('pinned installer recovers from transient 504, bounds persistent failures and never accepts a bad hash', {timeout:20000}, async()=>{
  const scratchRoot=resolve(tmpdir()),directory=mkdtempSync(join(scratchRoot,'abyss-luacheck-download-'));
  const bytes=Buffer.from('pinned luacheck download fixture\n'),sha256=createHash('sha256').update(bytes).digest('hex');
  const shared=new SharedArrayBuffer(4),requests=new Int32Array(shared);
  const server=new Worker(`
    const {parentPort,workerData}=require('node:worker_threads');
    const requests=new Int32Array(workerData.shared);
    const server=require('node:http').createServer((req,res)=>{
      const n=Atomics.add(requests,0,1)+1;
      if(req.url.startsWith('/not-found')){res.writeHead(404);res.end();}
      else if(n<=2||req.url.startsWith('/always-fail')){res.writeHead(504);res.end();}
      else{res.writeHead(200);res.end(Buffer.from(workerData.bytes));}
    });
    server.listen(0,'127.0.0.1',()=>parentPort.postMessage(server.address().port));
  `,{eval:true,workerData:{shared,bytes}});
  try{
    const [port]=await once(server,'message');
    for(const dir of ['scripts','config'])mkdirSync(join(directory,dir));
    for(const file of ['setup-lua-static.mjs','evidence-files.mjs'])writeFileSync(join(directory,'scripts',file),readFileSync('scripts/'+file));
    const asset=process.platform==='win32'?'luacheck.exe':'luacheck',installed=join(directory,'build/tools/luacheck',asset);
    const configure=(path='',digest=sha256)=>writeFileSync(join(directory,'config/lua-tools.json'),JSON.stringify({version:'1.2.0',repository:`http://127.0.0.1:${port}${path}`,win32:{asset:'luacheck.exe',sha256:digest},linux:{asset:'luacheck',sha256:digest}}));
    const run=()=>spawnSync(process.execPath,[join(directory,'scripts/setup-lua-static.mjs')],{cwd:directory,encoding:'utf8',timeout:15000,env:{...process.env,NO_PROXY:'127.0.0.1',no_proxy:'127.0.0.1'}});
    configure();let result=run();assert.equal(result.status,0,result.stdout+result.stderr);
    assert.equal(Atomics.load(requests,0),3,'two 504s are retried by real curl');assert.deepEqual(readFileSync(installed),bytes);
    writeFileSync(installed,'corrupt cached binary');result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/binary hash mismatch/);assert.equal(Atomics.load(requests,0),3,'hash failure is not retried');unlinkSync(installed);
    Atomics.store(requests,0,2);configure('', '0'.repeat(64));result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/Downloaded binary hash mismatch/);assert.equal(Atomics.load(requests,0),3,'bad downloaded hash is not retried');assert.equal(existsSync(installed),false);
    Atomics.store(requests,0,0);configure('/not-found');result=run();assert.notEqual(result.status,0);assert.equal(Atomics.load(requests,0),1,'permanent 404 is not retried');assert.equal(existsSync(installed),false);
    Atomics.store(requests,0,0);configure('/always-fail');result=run();assert.notEqual(result.status,0);assert.equal(Atomics.load(requests,0),3,'persistent 504 is bounded to three attempts');assert.equal(existsSync(installed),false);
  }finally{
    await server.terminate();assert.equal(dirname(directory),scratchRoot);assert.ok(basename(directory).startsWith('abyss-luacheck-download-'));rmSync(directory,{recursive:true,force:true});
  }
});
