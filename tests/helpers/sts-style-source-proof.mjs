import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const bytes=readFileSync(new URL('./sts-style-source-epoch.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'cc47fd96c79d7a604d2c5c269b012354d887762aecbe2990ac89fbf2ac74c1a9','complete StS production continuation');
export const stsStylePatch=JSON.parse(gunzipSync(bytes));
