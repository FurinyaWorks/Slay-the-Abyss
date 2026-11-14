// Exact product slice only; no CI or live runtime projection is imported here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {feedbackHash,freezeFeedbackData} from './sts-feedback-source-runtime.mjs';
const bytes=readFileSync(new URL('./sts-feedback-production.json.gz',import.meta.url));
assert.equal(feedbackHash(bytes),'3acda15f5db142eeabb48f9a494d1526bde5565eb7e2272d5a36277b7394ec39','complete exact feedback product slice');
export const feedbackProductionPatch=freezeFeedbackData(JSON.parse(gunzipSync(bytes)));
