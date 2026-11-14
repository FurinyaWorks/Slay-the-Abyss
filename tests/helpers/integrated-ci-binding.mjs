// Fixed trust leaf; excluded from its own archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),"d72e3119e7776dbb9931f1787c7047b9f7a60f40b2ff5cbc76e23e1caf0e2805",'complete reviewed integration CI sources');
