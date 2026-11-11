// Only the complete immutable 98fef input reader is accepted. The drag test
// independently compares every output with the original inverse function.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const blob=b=>createHash('sha1').update(`blob ${Buffer.byteLength(b)}\0`).update(b).digest('hex');
export function exactHistoricalDragTarget(inputs){
 const bytes=readFileSync(new URL('../fixtures/historical-drag-prepared-target.json.gz',import.meta.url));
 assert.equal(hash(bytes),'b633435a6f16cdaed58f3716766fb65239d8f0ac8c798e10d5a4662beb9e49f6','complete immutable derived drag target');
 const proof=JSON.parse(gunzipSync(bytes));
 assert.equal(proof.baseline.sourceCommit,'98fef95d047652aa6a8880241ddff28ef320a484');
 assert.equal(hash(readFileSync(new URL('../../'+proof.baseline.path,import.meta.url))),proof.baseline.sha256,'fresh original drag archive');
 assert.deepEqual(Object.keys(inputs).sort(),Object.keys(proof.inputClosure).sort(),'complete original drag input paths');
 for(const [path,row]of Object.entries(proof.inputClosure)){
  assert.equal(hash(inputs[path]),row.sha256,'complete original drag source: '+path);assert.equal(blob(inputs[path]),row.gitBlob,'original drag Git blob: '+path);
 }
 for(const [path,sha]of Object.entries(proof.oracles)){
  const url=new URL('../../'+path,import.meta.url);
  assert.equal(hash(path.endsWith('.gz')?readFileSync(url):readFileSync(url,'utf8').replaceAll('\r\n','\n')),sha,'fresh original drag oracle: '+path);
 }
 return Object.fromEntries(Object.entries(proof.files).map(([path,row])=>{
  assert.equal(inputs[path]?hash(inputs[path]):null,row.beforeSha256,'complete drag predecessor: '+path);
  if(row.after===null)return[path,null];
  assert.equal(hash(row.after.source),row.after.sha256,'complete derived drag source: '+path);assert.equal(blob(row.after.source),row.after.gitBlob,'derived drag Git blob: '+path);
  return[path,Buffer.from(row.after.source)];
 }));
}
