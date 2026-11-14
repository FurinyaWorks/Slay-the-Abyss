// Fixed trust leaf; exact template checked independently of its archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const feedbackCiBytes=readFileSync(new URL('./sts-feedback-ci.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(feedbackCiBytes).digest('hex'),"7f0ed1751513c5019ae5e5efc087395b63d14c11912fc58e66bdd415c68f1729",'complete feedback CI continuation');
