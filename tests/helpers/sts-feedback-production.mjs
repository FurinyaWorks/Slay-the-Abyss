// Exact product slice only; no CI or live runtime projection is imported here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {feedbackHash,freezeFeedbackData} from './sts-feedback-source-runtime.mjs';
const bytes=readFileSync(new URL('./sts-feedback-production.json.gz',import.meta.url));
assert.equal(feedbackHash(bytes),'dbf36e246ebaf9db114be52a828b05f8295213392d2e2a3a6693d075c051c83d','complete exact feedback product slice');
export const feedbackProductionPatch=freezeFeedbackData(JSON.parse(gunzipSync(bytes)));
