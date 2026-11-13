// Bind the overlay's own sources to its receipt; upstream receipts stay immutable.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const file=process.argv[2];assert(file,'finalize-identity.mjs <experiment candidate.json>');
const c=JSON.parse(fs.readFileSync(file)),hash=b=>createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p));
assert(c.experiment?.kind==='lumine-native-fit');assert.equal(sha(c.candidate.path),c.candidate.sha256);
assert.equal(sha(c.experiment.baseReceipt),c.experiment.baseReceiptSha256);
const base=JSON.parse(fs.readFileSync(c.experiment.baseReceipt));
// Refuse to relabel an already-built GIL with edited sources.
assert.equal(sha(c.experiment.sourceImage),c.experiment.sourceSha256,'Primary source changed after build');
if(c.experiment.featuresSourceSha256)assert.equal(sha('experiments/lumine-native-fit/input/source.png'),c.experiment.featuresSourceSha256,'Facial source changed after build');
assert.equal(sha('experiments/lumine-native-fit/build.mjs'),c.experimentManifest.builderSha256,'Builder changed after build');
assert.equal(sha('experiments/lumine-native-fit/runtime.lua'),c.experimentManifest.runtimeSha256,'Runtime changed after build');
for(const r of c.experiment.inputs){
 assert.equal(sha(r.path),r.sha256,'Fit changed after build: '+r.path);
 const pack=JSON.parse(fs.readFileSync(r.path));
 assert.equal(sha('scripts/art/segment-lowpoly.py'),pack.fitterSha256,'Fitter changed after generation');
}
const paths=[c.experiment.sourceImage,...c.experiment.inputs.map(r=>r.path),
 'scripts/art/segment-lowpoly.py','scripts/art/native-triangle-placement.py','scripts/v25-battle-scene.mjs',
 'scripts/native-ui-encoder.mjs','scripts/native-script-batch.mjs','experiments/lumine-native-fit/runtime.lua',
 'experiments/lumine-native-fit/build.mjs','experiments/lumine-native-fit/finalize-identity.mjs'];
if(c.experiment.featuresSourceSha256)paths.push('experiments/lumine-native-fit/input/source.png');
const records=[...new Set(paths.map(p=>path.resolve(p)))].map(p=>({path:path.relative(process.cwd(),p).replaceAll('\\','/'),sha256:sha(p),bytes:fs.statSync(p).size})).sort((a,b)=>a.path.localeCompare(b.path));
c.upstreamInputs=base.inputs;c.inputs=records;c.experiment.basePayloadDigest=base.payloadDigest;
c.payloadDigestScheme='lumine-overlay-v1';
c.payloadDigest=hash(JSON.stringify({scheme:c.payloadDigestScheme,baseGilSha256:base.candidate.sha256,basePayloadDigest:base.payloadDigest,inputs:records,moduleDigests:c.moduleDigests,nativeTemplateNames:c.experiment.nativeTemplateNames}));
c.experiment.release=false;c.experiment.productAcceptance='UNVERIFIED';
const archive=path.join(path.dirname(file),'candidate.before-overlay-identity.json');if(!fs.existsSync(archive))fs.copyFileSync(file,archive);
fs.writeFileSync(file,JSON.stringify(c,null,2));console.log(JSON.stringify({candidateSha256:c.candidate.sha256,payloadDigest:c.payloadDigest,scheme:c.payloadDigestScheme,sourceInputs:records.length}));
