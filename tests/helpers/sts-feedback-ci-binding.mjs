// Fixed trust leaf; exact template checked independently of its archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const feedbackCiBytes=readFileSync(new URL('./sts-feedback-ci.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(feedbackCiBytes).digest('hex'),"400925b5a24090e098ada9ab9787aac93e85c193918712365e688f3e2df05bd8",'complete feedback CI continuation');
