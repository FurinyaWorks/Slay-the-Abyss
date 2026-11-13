// Reuse the existing natural-flow/browser instrumentation, add an isolated
// settled-menu sample and identity-checked screenshots. No application changes.
import fs from'node:fs';import path from'node:path';import assert from'node:assert/strict';import{pathToFileURL}from'node:url';import{createHash}from'node:crypto';
const [serviceFile,outArg]=process.argv.slice(2),out=path.resolve(outArg);assert(!fs.existsSync(out));
const service=JSON.parse(fs.readFileSync(serviceFile)),original=fs.readFileSync('experiments/noncombat-review/browser-perf.mjs','utf8');let source=original;
function replace(a,b){assert.equal(source.split(a).length-1,1,'Browser proof anchor changed');source=source.replace(a,b)}
replace("const s=await state();if(name==='01-menu')",`const s=await state();assert(s.logs.some(l=>l.text==='ABYSS_BUILD '+service.buildId));assert(s.logs.some(l=>l.text==='ABYSS_UI ready'));if(name==='01-menu')`);
replace('report.shots.push({name,frame:s.frame,checks});return s;',`await cv.screenshot({path:out+'/'+name+'.png'});const background=find(s.tree,'menuRedBackground');function count(n){return 1+(n.children??[]).reduce((a,c)=>a+count(c),0)};fs.writeFileSync(out+'/'+name+'.state.json',JSON.stringify({buildId:service.buildId,frame:s.frame,logs:s.logs,backgroundControls:count(background)}));report.shots.push({name,frame:s.frame,checks,sha256:hash(fs.readFileSync(out+'/'+name+'.png'))});return s;`);
replace("let s=await shot('01-menu');",`let s=await shot('01-menu');await page.evaluate(()=>__PAGE_PROBE__.phase='menu-measure');await page.waitForTimeout(4000);if(!service.menuOnly){`);
replace('report.probe=await page.evaluate',`}report.probe=await page.evaluate`);
replace('({paints:__PAGE_PROBE__.paints})',`({paints:__PAGE_PROBE__.paints,resources:performance.getEntriesByType('resource').filter(r=>!r.name.includes('/editor/api/play')).map(r=>({name:r.name,duration:r.duration,transferSize:r.transferSize}))})`);
const toolDir=out+'-tool';fs.mkdirSync(toolDir,{recursive:true});const file=path.join(toolDir,'browser.mjs');fs.writeFileSync(file,source);
fs.writeFileSync(path.join(toolDir,'source.json'),JSON.stringify({original:'experiments/noncombat-review/browser-perf.mjs',originalSha256:createHash('sha256').update(original).digest('hex'),instrumentedSha256:createHash('sha256').update(source).digest('hex'),scope:'Renderer CPU submission timing during settled menu only; screenshots excluded from that phase; not GPU frame time'},null,2));
process.argv=[process.argv[0],file,path.resolve(serviceFile),out];await import(pathToFileURL(file));
const report=JSON.parse(fs.readFileSync(out+'/report.json')),samples=report.probe?.paints.filter(p=>p.phase==='menu-measure').map(p=>p.end-p.start).sort((a,b)=>a-b)??[];
assert(report.status==='captured'&&samples.length>=30,'At least 30 actual menu draws required');assert.deepEqual(report.errors,[]);
report.menuRendererCpuMs={samples:samples.length,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),scope:'WebGL renderer command submission wall time; not GPU/official FPS'};
fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({buildId:report.buildId,saveSha256:report.saveSha256,menuRendererCpuMs:report.menuRendererCpuMs,gpu:report.gpu,navigationToPositiveFrameMs:report.navigationToPositiveFrameMs}));
