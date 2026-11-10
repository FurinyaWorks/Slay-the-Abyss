// Exact registration boundary. The old Emerald archive and every older contract stay unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex');
const archive=readFileSync(new URL('./map-emerald-cost-timings-before.json.gz',import.meta.url));
assert.equal(hash(archive),'5d07b11d861c6b744ee8f5250af60e4de4c0308c672ac638ae64fdfb9680f4c2');
export const emeraldCostBeforeSource=gunzipSync(archive).toString('utf8');
assert.equal(hash(emeraldCostBeforeSource),'2cd79700b9abe2385265a2846e4f5339a46e6da88b327b80690785371bc5b146');
const receipt=readFileSync(new URL('../fixtures/map-emerald-cost-registration.json',import.meta.url));
assert.equal(hash(receipt),'19f522ed5140fb37ec2daeac218295cdb3679fca32737e36641737d37d76ed41');
function freeze(value){if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
export const emeraldCostRegistration=freeze(JSON.parse(receipt));
export function preEmeraldCostSource(path,source){
 if(path!=='scripts/ci-test-timings.json'||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!=='46e69e006ce623f0a66197db9f03859894b27152b4e90ee24fbe24cc42ab4289')return source;
 return emeraldCostBeforeSource;
}
