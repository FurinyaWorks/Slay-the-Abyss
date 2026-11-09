// Packaging-only reconstruction. Does not edit or regenerate tested source archives.
// Run from the repository root; output is written only after complete identity checks.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const identity=JSON.parse(readFileSync(new URL('./predecessor-proof-identity.json',import.meta.url),'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const facade=resolve(identity.immutableFacade);
assert.equal(hash(readFileSync(facade)),identity.immutableFacadeSha256,'exact base facade identity');
const {sourceEpoch}=await import(pathToFileURL(facade).href);
const bytes=Buffer.from(JSON.stringify(sourceEpoch.proof));
assert.equal(bytes.length,identity.uncompressedBytes,'complete predecessor proof byte length');
assert.equal(hash(bytes),identity.uncompressedSha256,'complete predecessor proof identity');
const output=process.argv[2];
if(output)writeFileSync(resolve(output),bytes,{flag:'wx'});
console.log(JSON.stringify({baseCommit:identity.baseCommit,sha256:hash(bytes),bytes:bytes.length,output:output?resolve(output):null,verified:true}));
