import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('./scripts/check-architecture.mjs',import.meta.url),'utf8');
const mutants=[['accept-invalid-records','if(valid)reviewedImports.push(row);','reviewedImports.push(row);'],['ignore-review-reasons',"if(typeof row.reason!=='string'||!row.reason.trim()) {","if(false) {"]];
for(const [name,from,to] of mutants){assert(source.includes(from));const path=new URL(`./scripts/mutant-${name}.mjs`,import.meta.url);writeFileSync(path,source.replace(from,to));const {analyzeSources}=await import(path);const r=analyzeSources({a:'return function() return require("b") end',b:'return require("a")'},{layers:{a:'core',b:'core'},deferredImports:[{from:'a',to:'b',reason:''}]},{});assert.equal(r.errors.some(e=>/Dependency cycle/.test(e.message)),false);console.log(`KILLED ${name}: real cyclic dependency improperly exempted under blank review (independent oracle requires cycle)`)}
