// Single-source exact inverse. Callers retain their fresh complete owner scans;
// this does not read or cache authorization and does not accept source fragments.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
export const defectUtilitySourceProof=Object.freeze({
 path:'src/lua/abyss_defect_utility_cards.lua',
 beforeSha256:'e9372f029db58b62e4fff8f4889826607e8d114dcab2cfa00ca4f124fe29f670',
 beforeGitBlob:'d709bd6f65eb9f3bca10b4b35fbd2c51df4d9e32',
 afterSha256:'921a0e333377d12bd54551b71d1af2d142fc404172df7bf62ba1d4351b33cfb5',
});
const before=normalize(readFileSync(new URL('../fixtures/defect-utility-planning-before.lua',import.meta.url),'utf8'));
assert.equal(hash(before),defectUtilitySourceProof.beforeSha256);
assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),defectUtilitySourceProof.beforeGitBlob);
export function preDefectUtilitySource(path,source){
 if(path!==defectUtilitySourceProof.path||typeof source!=='string'||hash(normalize(source))!==defectUtilitySourceProof.afterSha256)return source;
 return before;
}
