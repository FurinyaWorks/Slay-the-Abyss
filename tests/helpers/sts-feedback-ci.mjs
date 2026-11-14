// Data-only continuation. Production projectors never import this CI archive.
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {feedbackCiBytes} from './sts-feedback-ci-binding.mjs';
import {feedbackBase,feedbackPriorCiSha,freezeFeedbackData} from './sts-feedback-source-runtime.mjs';
const patch=JSON.parse(gunzipSync(feedbackCiBytes));
assert.equal(patch.schemaVersion,1);assert.equal(patch.normalization,'LF');
assert.equal(patch.baseCommit,feedbackBase);assert.equal(patch.priorArchiveSha256,feedbackPriorCiSha);
export const feedbackCiPatch=freezeFeedbackData(patch);
