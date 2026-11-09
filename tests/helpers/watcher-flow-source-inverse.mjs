// Standalone exact inverse. Shared historical epoch integration remains pending.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const normalize=s=>s.replaceAll('\r\n','\n');
const hash=s=>createHash('sha256').update(s).digest('hex');
export const watcherFlowSourceProof=Object.freeze({
 path:'src/lua/abyss_watcher_flow_cards.lua',
 beforeSha256:'08c363feb2269edbe1058457f5d7de39c1b1bf7e0b69b5ce05ad834641a961b9',
 beforeGitBlob:'315629be08198a61029d4b7d32b52001b6981fc9',
 afterSha256:'019fc60e728ffad81405b24323545b05718f452ae20c756f67fc6f56ce9e0217',
});
const before=normalize(readFileSync(new URL('../fixtures/watcher-flow-planning-before.lua',import.meta.url),'utf8'));
assert.equal(hash(before),watcherFlowSourceProof.beforeSha256);
assert.equal(createHash('sha1').update(`blob ${Buffer.byteLength(before)}\0`).update(before).digest('hex'),watcherFlowSourceProof.beforeGitBlob);
export function preWatcherFlowSource(path,source){
 if(path!==watcherFlowSourceProof.path||typeof source!=='string'||hash(normalize(source))!==watcherFlowSourceProof.afterSha256)return source;
 return before;
}
