// Fixed trust leaf; excluded from its own archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),"6f9f3910b0f73a8d7d627bf8e0aa02c8f65834b34d7ae3956f4cc0c4173d0edf",'complete reviewed integration CI sources');
