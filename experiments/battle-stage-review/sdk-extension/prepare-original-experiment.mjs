import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const dir='.artifacts/battle-repair-20261111/',base=dir+'input-cadence/private-web/',out=dir+'snapshot-private-web-v2/',hash=s=>createHash('sha256').update(s).digest('hex');
assert(!fs.existsSync(out),'private output must be fresh');
const original=fs.readFileSync(base+'dist/worker.js'),before=original.toString(),baseSha='1099c6d44940b40654a402baec405fd27add26de2d946138fb0f05261816f816';assert.equal(hash(original),baseSha);
const renderer=fs.readFileSync(dir+'input-cadence/leading-renderer.js');assert.equal(hash(renderer),'9e89976ce304a896d8c5e57ce40545f795b8668a4a5460c8459adceb9a52d15a');
let patched=before;function edit(a,b){assert.equal(patched.split(a).length,2,'worker fingerprint anchor drift');patched=patched.replace(a,b);}
edit('function Ea(e){','function Ea(e){__disposeSnapshotSession(e);');
edit('language:h.language||""}),fe(h)}function cs','language:h.language||""}),(()=>{try{__installSnapshotSession(d,x,E)}catch(error){try{Ea(x)}finally{x=null}throw error}})(),fe(h)}function cs');
patched='import{installSession as __installSnapshotSession,disposeSession as __disposeSnapshotSession}from"./snapshot-hook.mjs";\n'+patched;
fs.mkdirSync(out);fs.cpSync(base+'dist',out+'dist',{recursive:true});
for(const file of['LICENSE','package.json'])fs.copyFileSync(base+file,out+file);
fs.symlinkSync(fs.realpathSync(base+'node_modules'),out+'node_modules','junction');
fs.writeFileSync(out+'dist/worker.js',patched);fs.writeFileSync(out+'dist/public/play-renderer.js',renderer);
fs.copyFileSync(dir+'fengari-full-snapshot-bridge-typed.mjs',out+'dist/snapshot-bridge.mjs');fs.copyFileSync(dir+'snapshot-worker-hook.mjs',out+'dist/snapshot-hook.mjs');
const receipt={kind:'private-opt-in-SDK-runtime-backend-extension',baseWorkerSha256:baseSha,patchedWorkerSha256:hash(patched),rendererSha256:hash(renderer),bridgeSha256:hash(fs.readFileSync(out+'dist/snapshot-bridge.mjs')),hookSha256:hash(fs.readFileSync(out+'dist/snapshot-hook.mjs')),output:path.resolve(out),productionChanged:false,SDKOriginalChanged:false,officialEvidence:false};
fs.writeFileSync(dir+'snapshot-worker-receipt-v2.json',JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
