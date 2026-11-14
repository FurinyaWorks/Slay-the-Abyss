// Fixed trust leaf; exact template checked independently of its archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const feedbackCiBytes=readFileSync(new URL('./sts-feedback-ci.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(feedbackCiBytes).digest('hex'),"c91fadf0cda8b9b3d8fbe562854aa6c59ae007c13f1b978c6c905448eaf06f59",'complete feedback CI continuation');
