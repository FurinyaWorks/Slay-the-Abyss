// Exact product slice only; no CI or live runtime projection is imported here.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {feedbackHash,freezeFeedbackData} from './sts-feedback-source-runtime.mjs';
const bytes=readFileSync(new URL('./sts-feedback-production.json.gz',import.meta.url));
assert.equal(feedbackHash(bytes),'c073c2123818528e6f833cb146c6008e7ef76b2266a8839cd4872bf4ad8b0b6e','complete exact feedback product slice');
export const feedbackProductionPatch=freezeFeedbackData(JSON.parse(gunzipSync(bytes)));
