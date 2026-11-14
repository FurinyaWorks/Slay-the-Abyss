// Fixed trust leaf; excluded from its own archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const menuCiBytes=readFileSync(new URL('./menu-red-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(menuCiBytes).digest('hex'),"f2da4416d434baa3c1aa20fb8c0c3d7b37c2c2457f4ce00adc63c6c746bff7f6",'complete menu CI continuation');
