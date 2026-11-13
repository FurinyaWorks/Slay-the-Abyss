import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {restoreReport} from './restore-report-archive.mjs';
const root=new URL('./historical-report-archive/',import.meta.url);
const index=JSON.parse(fs.readFileSync(new URL('index.json',root),'utf8'));
for(const e of index.reports)test('archive digest and semantic identity '+e.path,()=>{
 const read=p=>fs.readFileSync(new URL(p,root),'utf8');
 const text=restoreReport(e,read);
 const originalUrl=new URL(e.path,import.meta.url);
 if(fs.existsSync(originalUrl))assert.equal(text,fs.readFileSync(originalUrl,'utf8'));
 assert.equal(JSON.parse(text).version,e.version);
 assert.throws(()=>restoreReport(e,p=>read(p)+' '),/digest/);
 assert.throws(()=>restoreReport({...e,originalSha256:'0'},read),/digest/);
});
