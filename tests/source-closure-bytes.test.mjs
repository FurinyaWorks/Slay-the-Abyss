import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {integrationClosureBytes} from './helpers/copy-integration-source-closure.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');

test('helper closure identities and materialized text use LF for both checkout endings',()=>{
 for(const suffix of ['mjs','js','json','lua','md','yml','yaml']){
  const path='tests/helpers/owner.'+suffix;
  const lf=Buffer.from('first\n中文\nlast\n'),crlf=Buffer.from(lf.toString().replaceAll('\n','\r\n'));
  assert.deepEqual(integrationClosureBytes(path,crlf),lf);
  assert.deepEqual(integrationClosureBytes(path,lf),lf);
  const changed=Buffer.from(crlf);changed[0]^=1;
  assert.notEqual(hash(integrationClosureBytes(path,changed)),hash(lf),'non-ending mutation remains visible');
  assert.notEqual(hash(integrationClosureBytes(path,Buffer.from(lf.toString()+'\n'))),hash(lf),'added LF remains visible');
  assert.notEqual(hash(integrationClosureBytes(path,Buffer.from('first\rsecond\n'))),hash(Buffer.from('first\nsecond\n')),'standalone CR is not normalized');
  assert.throws(()=>integrationClosureBytes(path,Buffer.from([0xff])),/valid UTF-8/);
 }
});

test('gzip and unrecognized binary dependencies preserve every byte and mutations remain visible',()=>{
 for(const [path,bytes]of [['tests/helpers/proof.json.gz',gzipSync(Buffer.from('witness\r\nbytes\0'))],['tests/helpers/proof.bin',Buffer.from([0xff,0x0d,0x0a,0x00])]]){
  assert.strictEqual(integrationClosureBytes(path,bytes),bytes);
  const changed=Buffer.from(bytes);changed[changed.length-1]^=1;
  assert.notEqual(hash(integrationClosureBytes(path,changed)),hash(bytes));
  assert.notEqual(hash(integrationClosureBytes(path,bytes.subarray(1))),hash(bytes));
 }
});
