// Fixed trust leaf; excluded from its own archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const integratedCiBytes=readFileSync(new URL('./integrated-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(integratedCiBytes).digest('hex'),"ad40a534f5c15f7955920ecae3f1cef8249c28f728a239968c1f7e539af4f4df",'complete reviewed integration CI sources');
