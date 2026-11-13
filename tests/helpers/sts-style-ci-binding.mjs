// Fixed trust leaf; excluded from its own archive to avoid a self hash cycle.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const stsStyleCiBytes=readFileSync(new URL('./sts-style-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(stsStyleCiBytes).digest('hex'),'3ae1599f14216ab2211e5f67b56fa416cb0fe2e16d52c252365b04ae636ade72','complete StS CI continuation');
