import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
assert.match(readFileSync('tests/ci-complete-calibration.test.mjs','utf8'), /preColorlessDescriptionCiSource/, 'the frozen Formation800 reader must project the approved Colorless epoch');
