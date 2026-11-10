// Complete-byte local cost epoch. All predecessor data and assertions remain unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./ending-terminal-ci-source-epoch.json.gz',import.meta.url));
assert.equal(hash(archive),'a4c341fc65a4e01f76b24497f0637a0d3465509e3ded4e0842749e09ef416cd3');
const bytes=gunzipSync(archive);assert.equal(hash(bytes),'312c879277e55ac38d713ae1e9b2e21596c67d99bdaacf5bc41145d22d812e7d');
export const endingTerminalCiProof=JSON.parse(bytes);
for(const binding of Object.values(endingTerminalCiProof.files)){
 assert.equal(hash(binding.beforeSource),binding.beforeSha256);assert.equal(hash(binding.afterSource),binding.afterSha256);
}
export function preEndingTerminalCiSource(path,source){
 const binding=Object.hasOwn(endingTerminalCiProof.files,path)?endingTerminalCiProof.files[path]:null;
 if(!binding||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==binding.afterSha256)return source;
 return binding.beforeSource;
}
