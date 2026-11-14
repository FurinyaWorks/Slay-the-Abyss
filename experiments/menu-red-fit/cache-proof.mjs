import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const [save,sdk,outArg]=process.argv.slice(2),out=path.resolve(outArg);assert(!fs.existsSync(out));
const original=fs.readFileSync('experiments/noncombat-review/measure.mjs','utf8');let source=original;
function replace(a,b){assert.equal(source.split(a).length-1,1,'Cache proof anchor changed');source=source.replace(a,b)}
replace("scope:'actual GIL scripts, read-only state query, native pointer commands'","scope:'Current-style source preview with actual GIL background; read-only queries and native pointer commands; SDK CPU only'");
replace('function tap(p){',`function settleReveal(){for(let i=0;i<900;i++){if(!native('stage/pageReveal').visible)return;step()}throw Error('Current page reveal did not settle')}
function tap(p){settleReveal();`);
replace("pointer('up',xy);step()}","pointer('up',xy);step();settleReveal()}");
replace("if(s.portraits.selection?.phase==='ready')return s;","if(s.characterOpen&&native('stage/characterPanel').visible&&!native('stage/pageReveal').visible&&s.portraits.selection?.phase==='ready')return s;");
replace("stage('selection-return-20',()=>{const counts=[];",`stage('selection-return-20',()=>{const background=native('stage/menuPanel/menuRuinsScene/menuRedBackground'),ids=descendants(background).map(n=>n.Id);const counts=[];`);
replace('counts.push(session.runtime.controlsById.size)',`assert.equal(native('stage/menuPanel/menuRuinsScene/menuRedBackground'),background,'Background must not be recreated');assert.deepEqual(descendants(background).map(n=>n.Id),ids,'Background control identities must survive all returns');counts.push(session.runtime.controlsById.size)`);
const dir=out+'-tool';fs.mkdirSync(dir,{recursive:true});const file=path.join(dir,'measure.mjs');fs.writeFileSync(file,source);
fs.writeFileSync(path.join(dir,'source.json'),JSON.stringify({original:'experiments/noncombat-review/measure.mjs',originalSha256:createHash('sha256').update(original).digest('hex'),instrumentedSha256:createHash('sha256').update(source).digest('hex')},null,2));
process.argv=[process.argv[0],file,path.resolve(save),path.resolve(sdk),out];await import(pathToFileURL(file));
const report=JSON.parse(fs.readFileSync(out));assert.equal(report.status,'pass');report.backgroundReusedFor20Returns=true;fs.writeFileSync(out,JSON.stringify(report,null,2));
