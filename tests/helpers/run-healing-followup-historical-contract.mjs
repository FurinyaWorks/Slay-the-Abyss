// Authenticate the published assertion body; redirect only its two input imports.
// The original file is never edited, and its assertion code executes unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {successorProof} from './run-healing-followup-predecessor.mjs';
const path='tests/helpers/run-healing-ci-contract.mjs',url=new URL('./run-healing-ci-contract.mjs',import.meta.url);
const source=readFileSync(url,'utf8').replaceAll('\r\n','\n');
assert.equal(createHash('sha256').update(source).digest('hex'),successorProof.publishedSha256[path]);
const redirects=new Map([['node:fs',new URL('./run-healing-followup-predecessor.mjs',import.meta.url).href],['../../scripts/ci-shards.mjs',new URL('./run-healing-followup-predecessor.mjs',import.meta.url).href]]);
let redirected=0;
const adapted=source.replace(/from '([^']+)'/g,(whole,spec)=>{if(redirects.has(spec)){redirected++;return `from '${redirects.get(spec)}'`;}return spec.startsWith('.')?`from '${new URL(spec,url).href}'`:whole;});
assert.equal(redirected,2,'only fs/planning imports receive historical input adapters');
await import('data:text/javascript,'+encodeURIComponent(adapted));
