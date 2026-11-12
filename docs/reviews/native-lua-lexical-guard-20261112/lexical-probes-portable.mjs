import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(process.argv[2]||process.cwd());
const {validateNativeLua}=await import(pathToFileURL(join(root,'scripts/native-script-batch.mjs')));
const require=createRequire(pathToFileURL(join(root,'package.json')));
const parser=require('luaparse');
const syntax=source=>{try{parser.parse(source,{luaVersion:'5.3'});return null;}catch(e){return e;}};
let checked=0;
function check(source,unsupported){assert.equal(syntax(source),null,source);if(unsupported)assert.throws(()=>validateNativeLua(source,syntax),/Unsupported native Lua API/,source);else assert.doesNotThrow(()=>validateNativeLua(source,syntax),source);checked++;}
for(const eq of ['', '=', '==', '=====', '================']) {
 const literal=`[${eq}[io.open('x'); os.execute('x'); -- ]${eq}]`;
 check(`local x=${literal}; return os.clock()`,false);
 check(`local x=${literal}; io.open('x')`,true);
 const comment=`--[${eq}[" -- io.open('x') ]${eq}]`;
 check(`${comment}\nreturn debug.traceback()`,false);
 for(const call of [`io${comment}.open('x')`,`string.${comment}dump(function()end)`,`load${comment}('x')`])check(call,true);
}
for(const newline of ['\n','\r','\r\n','\n\r']) {
 check(`-- io.open('x')${newline}return os.time()`,false);
 check(`-- innocent${newline}io.open('x')`,true);
}
for(const literal of [String.raw`"--"`,String.raw`'--[['`,String.raw`"a\"--"`,String.raw`'a\'--'`, '"line\\\n--"']) {
 check(`local s=${literal}; return s`,false);
 check(`local s=${literal}; io.open('x')`,true);
}
for(const source of ['local a=1 .. "io.open"; return a','local a="load" .. "("; return a','return os.difftime(2,1)','return os.date()','return os.clock()','return debug.traceback()','return obj.load(1)','return obj:load(1)','local download=function()end; download()'])check(source,false);
for(const source of ['os.timezone()','debug.traceback_extra()','io.open("x")','loadfile("x")','dofile("x")','package.loaded.x=1','coroutine.running()'])check(source,true);
let calls=0;
assert.throws(()=>validateNativeLua('return 1',source=>{calls++;assert.equal(source,'return 1');return {message:'sentinel'};}),/^Error: Lua syntax: sentinel$/);assert.equal(calls,1);
for(const source of ['local x="unterminated','local x=[=[unterminated','--[==[unterminated'])assert.throws(()=>validateNativeLua(source,()=>null),/Lua syntax:/);
for(const source of ['', ' ',null,undefined,42])assert.throws(()=>validateNativeLua(source,()=>{throw Error('callback should not run');}),/Empty native Lua/);
console.log(JSON.stringify({lexicalCases:checked,callbackAndMalformedCases:9,result:'PASS'}));
