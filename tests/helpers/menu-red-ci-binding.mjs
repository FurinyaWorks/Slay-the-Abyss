// Fixed trust leaf; excluded from its own archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const menuCiBytes=readFileSync(new URL('./menu-red-ci-source.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(menuCiBytes).digest('hex'),"c56d05ae2533f27a4d083c5331b54539851c69ba6535783da83c7965261c9486",'complete menu CI continuation');
