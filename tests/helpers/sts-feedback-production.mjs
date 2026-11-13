// Exact product slice only; no CI or live runtime projection is imported here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {feedbackHash,freezeFeedbackData} from './sts-feedback-source-runtime.mjs';
const bytes=readFileSync(new URL('./sts-feedback-production.json.gz',import.meta.url));
assert.equal(feedbackHash(bytes),'93e45ddd9ce871295047cc80d2c8041e46f73ea49bb348b2898d1ee506bddd4f','complete exact feedback product slice');
export const feedbackProductionPatch=freezeFeedbackData(JSON.parse(gunzipSync(bytes)));
