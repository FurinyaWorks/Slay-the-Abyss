// Collect measured evidence; refuse incomplete matrices or mismatched builds.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import os from 'node:os';
const [candidateFile,adapterFile,performanceDir,browserDir,contractsFile,out]=process.argv.slice(2);
assert(out&&!fs.existsSync(out),'summarize.mjs <candidate> <adapter> <performance-dir> <browser-dir> <contracts> <new-evidence-dir>');
const read=p=>JSON.parse(fs.readFileSync(p)),c=read(candidateFile),a=read(adapterFile),p=read(performanceDir+'/performance.json'),b=read(browserDir+'/browser.json'),k=read(contractsFile);
assert.equal(p.status,'pass');assert.equal(b.status,'pass');assert.equal(k.status,'pass');assert.equal(p.samples.length,25);
assert.equal(p.sourceStable,true);assert.equal(p.missingAssets.length,0);assert.equal(k.remainingControls,0);
assert.equal(a.candidateSha256,c.candidate.sha256);assert.equal(b.candidateSha256,c.candidate.sha256);
for(const v of [p,b,k])assert.equal(v.saveSha256,a.saveSha256);
const q=(values,f=.95)=>{const sorted=[...values].sort((x,y)=>x-y);return sorted[Math.max(0,Math.ceil(sorted.length*f)-1)]},ms=n=>Number(n).toFixed(1);
const rows=[];
for(const budget of p.modes){
 const s=p.samples.filter(s=>s.budget===budget),warm=s.flatMap(s=>s.warm),cost=c.experiment.costs.find(x=>x.budget===budget);
 assert.equal(s.length,5);assert.equal(warm.length,10);assert(s.every(s=>s.status==='pass'&&s.noExperimentPreload&&s.visibleStaticNoRebuild&&s.staticNoRebuild&&s.boundedCache&&s.teardown.after===0));
 if(cost)for(const x of s){assert.equal(x.fitMaskState.half,cost.fillMasks);assert.equal(x.fitMaskState.half+x.fitMaskState.whole,cost.images);assert.equal(x.fitActuallyPaintedImages,cost.images);}
 rows.push({budget,images:cost?.images??null,containers:cost?.containers??null,masks:cost?.fillMasks??null,
  coldP50:q(s.map(x=>x.coldOperableMs),.5),coldP95:q(s.map(x=>x.coldOperableMs)),warmP95:q(warm.map(x=>x.fullDisplayMs)),warmTriggerToModelP95:q(warm.map(x=>x.triggerToModelMs)),warmDriverGeometryP95:q(warm.map(x=>x.driverGeometryMs)),
  sourceReadP50:q(s.map(x=>x.readParseMs),.5),initializeP50:q(s.map(x=>x.initializeMs),.5),fitReadP50:cost?q(s.map(x=>x.fit.readMs),.5):null,fitCreateP50:cost?q(s.map(x=>x.fit.createMs),.5):null,fitRevealP50:cost?q(s.map(x=>x.fit.revealMs),.5):null,
  softwarePngP50:q(s.map(x=>x.firstPngMs),.5),snapshotP50:q(s.map(x=>x.snapshotMs),.5),resident:s.map(x=>x.residentControls),visibleImages:s.map(x=>x.visibleImages),
  nodeRssMiB:s.map(x=>x.memoryAfter.rss/1048576),nodeHeapUsedMiB:s.map(x=>x.memoryAfter.heapUsed/1048576),sdkVisibleStepP95:q(s.flatMap(x=>[x.visibleStatic.sdkStepMs.p95])),longSdkSteps100ms:s.reduce((n,x)=>n+x.longSdkSteps100ms,0),runtimeDataBytes:cost?.runtimeDataBytes??0});
}
const gpu=b.cases.map(x=>{assert.equal(x.status,'pass');assert.equal(x.probe.gpuDisjoint,false);assert(x.probe.gpuElapsedMs.length>0);return {budget:x.budget,renderer:x.probe.gpuRenderer,gpuSamples:x.probe.gpuElapsedMs.length,gpuP95:q(x.probe.gpuElapsedMs),cpuDrawP95:q(x.probe.cpuDrawSubmissionMs),drawIntervalP95:q(x.probe.actualDrawIntervalsMs),rafP95:q(x.probe.rafIntervalMs),drawIntervalsOver33ms:x.probe.actualDrawIntervalsMs.filter(n=>n>33.3).length,drawIntervalsOver100ms:x.probe.actualDrawIntervalsMs.filter(n=>n>100).length,drawIntervals:x.probe.actualDrawIntervalsMs.length};});
fs.mkdirSync(out,{recursive:true});const copy=(src,name)=>fs.copyFileSync(src,path.join(out,name));
for(const [src,name] of [[candidateFile,'candidate.json'],[adapterFile,'adapter-receipt.json'],[performanceDir+'/performance.json','performance.json'],[browserDir+'/browser.json','browser.json'],[contractsFile,'contracts.json'],[path.join(path.dirname(candidateFile),'experiment-verification.json'),'verification.json']])copy(src,name);
for(const budget of [400,800,1600,3200])copy(performanceDir+'/budget-'+budget+'-art-only.png','native-'+budget+'.png');
for(const budget of [0,800,1600,3200])copy(browserDir+'/browser-'+budget+'.png','browser-'+budget+'.png');
const summary={candidateSha256:c.candidate.sha256,saveSha256:a.saveSha256,buildId:c.buildId,baseSource:c.sourceCommit,hardware:{cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,systemMemoryGiB:os.totalmem()/1073741824},gilBytes:c.candidate.bytes,baseGilBytes:c.experiment.baseGil.bytes,gilIncrementBytes:c.candidate.bytes-c.experiment.baseGil.bytes,sharedTemplateBytes:c.experiment.sharedTemplateBytes,rows,gpu,
 verdict:{nativeFeasibility:'GO: actual native GIL, real Simulator rendering and bounded cache demonstrated',productRelease:'NO-GO: complete display latency targets not achieved in measured Simulator path; quality not owner-approved',officialImport:'UNVERIFIED',officialCapacity:'UNVERIFIED',mobile:'UNVERIFIED',nativeClientGpu:'UNVERIFIED'}};
const acceptancePath=new URL('./owner-acceptance.json',import.meta.url);
const acceptance=fs.existsSync(acceptancePath)?read(acceptancePath):null;
const ownerAccepted=acceptance?.acceptedBudget===1600&&acceptance.candidateSha256===c.candidate.sha256&&acceptance.saveSha256===a.saveSha256;
summary.verdict.quality=ownerAccepted?'GO: Owner accepted the current 1600-primitive appearance on '+acceptance.acceptedAt:'NO-GO: 1600 facial edges/nose/mouth remain fragmented; 3200 improves contours but does not match reference detail';
if(ownerAccepted){summary.selectedBudget=1600;summary.ownerAcceptance=acceptance;summary.verdict.productRelease='NO-GO: complete display latency targets not achieved in measured Simulator path; official performance UNVERIFIED';}
summary.verdict.multiCharacterSwitch='UNVERIFIED: other roles stay locked; warm samples are page reentries';
summary.verdict.memoryRelease='UNVERIFIED: SDK controls destroy to zero; no official heap/GPU memory proof';
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));
let text=`# 本轮实测结果\n\n**产品交付 NO-GO；原生表达/缓存可行性 GO；官方客户端、手机与官方容量 UNVERIFIED。**\n\n新参考图的头发/背景 + 原参考图的五官，优先候选1600，400/800淘汰。1600仍是首版拟合，不宣称达到原画精细度或Owner画质验收。没有要求用户导入半成品。\n\nGIL SHA256：\`${c.candidate.sha256}\`；buildId \`${c.buildId}\`；基线源码 \`${c.sourceCommit}\`。实际 GIL ${c.candidate.bytes} 字节，B0 ${c.experiment.baseGil.bytes} 字节，**四档一起打包的实际增量 ${summary.gilIncrementBytes} 字节**。这是文件字节，不是官方容量。预制共享部分 ${summary.sharedTemplateBytes} 字节；其他为行数据/脚本等。\n\n## 同构建完整显示\n\n每档5次新VM冷进入、10次缓存重入，共25冷/50热；原始逐样本见 performance.json。冷包括关卡初始化、完整实际软件PNG及返回按钮生效。共享OS/Node缓存，不是官方关卡冷启动。热完整显示包含驱动几何/快照/软件光栅；触发到模型另列，不能代替完整显示。没有主菜单预热。单位ms。\n\n|预算|真实图片|额外容器|半幅蒙版|冷P50|冷P95|热完整P95|热触发→模型P95|常驻对象|\n|---|---:|---:|---:|---:|---:|---:|---:|---:|\n`;
for(const r of rows)text+=`|${r.budget||'原背景'}|${r.images??'原有'}|${r.containers??'—'}|${r.masks??'—'}|${ms(r.coldP50)}|${ms(r.coldP95)}|${ms(r.warmP95)}|${ms(r.warmTriggerToModelP95)}|${r.resident[0]}|\n`;
text+='\n冷≤1000ms、热≤100ms为目标，本路径没有达标。低图元并未消除现有整页/SDK/快照成本；缓存省去几何重建，但不等于完整画面秒切。不得以单独reveal耗时宣称成功。\n\n## 加载归因与资源\n\n各列为五次冷测中位数，不能相加成总耗时（还有输入驱动、真实页面准备等）。Node内存是进程代理，包含共享缓存、GC及基线，不能当作官方RAM增量。SDK step是CPU工作，不是GPU帧。\n\n|预算|读取/解析save|初始化|fit读取|fit创建|fit显示调用|首张软件PNG|可见图片|Node RSS MiB范围|可见SDK step P95上界|>100ms SDK步数|\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for(const r of rows)text+=`|${r.budget||'原背景'}|${ms(r.sourceReadP50)}|${ms(r.initializeP50)}|${r.fitReadP50==null?'—':ms(r.fitReadP50)}|${r.fitCreateP50==null?'—':ms(r.fitCreateP50)}|${r.fitRevealP50==null?'—':ms(r.fitRevealP50)}|${ms(r.softwarePngP50)}|${r.visibleImages[0]}|${ms(Math.min(...r.nodeRssMiB))}–${ms(Math.max(...r.nodeRssMiB))}|${ms(r.sdkVisibleStepP95)}|${r.longSdkSteps100ms}|\n`;
text+='\n全部样本可见120步零新建、隐藏120步零重建，10次重入对象数恒定；所有25次VM销毁后对象数为0，无Lua错误、无缺失图片资源。7项实际Lua合同通过，另注入创建/销毁拒绝验证原UI恢复。\n\n## 真实浏览器渲染\n\n这是同GIL、同save的无头Chromium + 安装的Simulator，实际WebGL disjoint查询，不是Lua dt或软件PNG。GPU elapsed是一次GPU提交的执行时间，不等于整帧；CPU提交、实际draw间隔、RAF分别列出，不据此授予官方30FPS验收。没有官方客户端或手机成绩。硬件：'+gpu[0].renderer+'。\n\n|预算|有效GPU样本|GPU elapsed P95|CPU draw P95|实际draw间隔P95|RAF P95|draw间隔>33.3ms|>100ms|\n|---|---:|---:|---:|---:|---:|---:|---:|\n';
for(const r of gpu)text+=`|${r.budget||'原背景'}|${r.gpuSamples}|${ms(r.gpuP95)}|${ms(r.cpuDrawP95)}|${ms(r.drawIntervalP95)}|${ms(r.rafP95)}|${r.drawIntervalsOver33ms}/${r.drawIntervals}|${r.drawIntervalsOver100ms}|\n`;
text+='\n## 看图与复现\n\n[原参考图](../input/source.png)、[结构参考图](../input/structure-reference.png)、[实际原生1600图](native-1600.png)、[实际原生3200图](native-3200.png)、[1600完整浏览器页面](browser-1600.png)、[3200完整浏览器页面](browser-3200.png)。native-*是实际SDK场景树的软件渲染，只隐藏其他UI作对照；browser-*是真实浏览器canvas截图，均不是离线拟合预览。\n\n参数、命令与历史失败见[实验说明](../README.md)。保存完整原始矩阵、浏览器查询、合同、候选及adapter身份，复现不依赖口头统计。本轮未取得官方导入/ready、设备或容量证据；不合并、不发布，不冒充正式RC。\n';
text+='\n## 画质及测量限制\n\n[原图与实际场景对照](comparison.png)。1600眉眼、鼻嘴和脸部仍有碎块；3200改善轮廓，仍未达参考图精细度。没有画质与延迟同时通过的产品候选，不把等待Owner批准当作画质判断。\n\n这是共享Windows环境、同Node进程的新VM矩阵，未强制GC。5次冷测的最近秩P95为最大值，不能当稳定总体估计；不筛除GC/调度慢样本。其他角色仍锁定，重入不是多角色/多背景切换证明。控件销毁归零不证明堆/RSS/GPU显存即时归还；不授予内存很好结论。\n';
if(ownerAccepted){
 text=text.replace('**产品交付 NO-GO；原生表达/缓存可行性 GO；官方客户端、手机与官方容量 UNVERIFIED。**','**1600画质 GO（Owner已确认）；原生表达/缓存可行性 GO；完整显示性能仍未达标，产品交付暂为 NO-GO；官方客户端、手机与官方容量 UNVERIFIED。**');
 text=text.replace('1600仍是首版拟合，不宣称达到原画精细度或Owner画质验收。','Owner于'+acceptance.acceptedAt+'确认当前1600图元画质已经可以，1600固定为主候选，3200仅保留对照。');
 text=text.replace('1600眉眼、鼻嘴和脸部仍有碎块；3200改善轮廓，仍未达参考图精细度。没有画质与延迟同时通过的产品候选，不把等待Owner批准当作画质判断。','初轮诊断记录了眉眼、鼻嘴和脸部色块差异；Owner已查看并接受当前1600版本，这些差异不再作为画质阻塞。剩余门槛为完整显示/切换性能和官方设备验证，不再增加美术预算或强压图元。');
 text+='\nOwner确认绑定本轮GIL/save及1600预算，详见[确认记录](../owner-acceptance.json)。这不是性能、官方导入、设备、合并或发布许可。\n';
}
fs.writeFileSync(path.join(out,'RESULTS.md'),text);console.log(JSON.stringify({status:'pass',out,summary}));
