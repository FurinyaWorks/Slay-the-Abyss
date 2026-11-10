// Only the exact optimized fixture may stand in for this frozen historical input.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=value=>createHash('sha256').update(value).digest('hex');
export const emeraldFixturePath='tests/helpers/map-emerald-cases.lua';
export const emeraldFixtureAfterSha256='551b49dac1ddd5aaa0bef7617232b4d483802f248f35393a1d79bce884e7650f';
export const emeraldFixtureBeforeSource=readFileSync(new URL('../fixtures/map-emerald-cases-before-reuse.lua',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(hash(emeraldFixtureBeforeSource),'afd3fc85fdd4dff15d71d7a94f3a4fb178fffd39ab8f7362852f0f016d3b87b9');
export function preEmeraldFixtureSource(path,source){
 if(path!==emeraldFixturePath||typeof source!=='string'||hash(source.replaceAll('\r\n','\n'))!==emeraldFixtureAfterSha256)return source;
 return emeraldFixtureBeforeSource;
}
