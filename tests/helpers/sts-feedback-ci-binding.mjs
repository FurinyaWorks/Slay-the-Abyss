// Fixed trust leaf; exact template checked independently of its archive.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const feedbackCiBytes=readFileSync(new URL('./sts-feedback-ci.json.gz',import.meta.url));
assert.equal(createHash('sha256').update(feedbackCiBytes).digest('hex'),"654afb7b2d28a258c7285e215defe53e3f51aa77a41a51a9d10c54dcb69d0e38",'complete feedback CI continuation');
