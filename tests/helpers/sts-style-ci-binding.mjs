// Fixed trust leaf; excluded from its own archive to avoid a self hash cycle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const stsStyleCiBytes=readFileSync(new URL('./sts-style-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(stsStyleCiBytes).digest('hex'),'4dc022273fd7ca381b1de6bca1fdd1c9eb49ceb94df292d9e490b4ab2abc80f5','complete StS CI continuation');
