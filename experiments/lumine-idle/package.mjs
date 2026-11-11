import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
const out='docs/evidence/lumine-native-idle-20261111';fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const perf=Object.fromEntries(['baseline-a','133','210','baseline-b'].map(n=>[n,read('.artifacts/lumine-idle/performance/'+n+'.json')]));
const browsers={baseline:read('.artifacts/lumine-idle/browser-baseline-r2/report.json'),candidate:read('.artifacts/lumine-idle/browser-210-final/report.json')};
const stage=(r,name)=>r.stages.find(s=>s.name===name),round=n=>Math.round(n*100)/100;
const sdk=Object.fromEntries(Object.entries(perf).map(([n,r])=>[n,{status:r.status,
 coldInitializeMs:round(stage(r,'cold-initialize').elapsedMs),figureReadyCpuMs:round(stage(r,'portrait-ready-feedback-idle').elapsedMs),
 figureReadySteps:stage(r,'portrait-ready-feedback-idle').steps,figureOwned:stage(r,'portrait-ready-feedback-idle').state.portraits.battle.owned,
 warmWholePageControls:stage(r,'steady-120-frames').controlsAfter,steady:stage(r,'steady-120-frames').sdkStepMs,
 census:stage(r,'actual-idle-native-call-census').state,cleanup:stage(r,'engine-root-cleanup').state,faults:r.faults.length}]));
const browser=Object.fromEntries(Object.entries(browsers).map(([n,r])=>{
 const samples=r.isolated.map(x=>x.ms).sort((a,b)=>a-b);
 return [n,{status:r.status,isolatedSamplesMs:samples,isolatedMedianMs:round((samples[3]+samples[4])/2),
  stream:r.stream,release:r.release.map(x=>({flightMs:round(x.flightMs),damageMs:round(x.damageMs)})),
  observedPageMs:round(r.coldReady.gotoToObservedFrameMs),figureAfterPageMs:round(r.figureReadyAfterObservedPageMs),gpu:r.gpu,
  pageErrors:r.console.filter(x=>x.type==='pageerror'),explicitStop:r.explicitStop?.value?.running===false}];
}));
const candidates=Object.fromEntries(['baseline','133','210'].map(n=>[n,read('build/lumine-accepted-review/'+n+'/candidate.json')]));
const summary={conclusion:'NO-GO for replacing default skin',reason:'visual fidelity requires 7303 images; browser interaction regresses and cold figure publication is slow; strict foot pixel invariant fails',
 sdk,browser,visual:read(out+'/visual-measurements.json'),hybrid:read('.artifacts/lumine-idle/hybrid/receipt.json'),
 candidate:{buildId:candidates['210'].buildId,...candidates['210'].candidate},
 officialImport:'not_run',officialReady:'not_run',physicalPC:'not_run',physicalPhone:'not_run',officialCapacity:'not_measured',
 scope:'SDK CPU and real browser input-to-draw only; not GPU FPS, official client performance or capacity. Census is instrumented and excluded from steady timing.'};
fs.writeFileSync(out+'/metrics-summary.json',JSON.stringify(summary,null,2)+'\n');
const archive=(source,name)=>fs.writeFileSync(out+'/'+name+'.gz',gzipSync(fs.readFileSync(source),{level:9}));
for(const n of Object.keys(perf))archive('.artifacts/lumine-idle/performance/'+n+'.json','sdk-'+n+'.json');
archive('.artifacts/lumine-idle/browser-baseline-r2/report.json','browser-baseline.json');
archive('.artifacts/lumine-idle/browser-210-final/report.json','browser-210.json');
for(const n of Object.keys(candidates))archive('build/lumine-accepted-review/'+n+'/candidate.json','candidate-'+n+'.json');
archive('.artifacts/lumine-idle/reviewed-210/adapter-receipt.json','adapter-210.json');
archive('.artifacts/lumine-idle/readback-font-state-210/adapter-receipt.json','adapter-font-state-210.json');
archive('.artifacts/lumine-idle/converted/idle-210.json','idle-210-asset.json');
archive('.artifacts/lumine-idle/hybrid/scene.json','hybrid-scene.json');
archive('.artifacts/lumine-idle/hybrid/primitive.lua','hybrid-runtime.lua');
archive('.artifacts/lumine-idle/hybrid/receipt.json','hybrid-receipt.json');
fs.copyFileSync('.artifacts/lumine-idle/hybrid/native-shapes.png',out+'/hybrid-768-rejected.png');
for(const [source,name] of [
 ['.artifacts-lumine-engineering.log','engineering.log'],['.artifacts-lumine-runtime-regressions.log','runtime-regressions.log'],
 ['.artifacts-lumine-final-all-tests.log','final-related-43.log'],
 ['.artifacts-lumine-tests.log','portrait-lifecycle-36.log'],['.artifacts-lumine-final-tests.log','final-idle-tests.log'],
 ['.artifacts-lumine-visual-measurements.log','visual-strict-failure.log'],['.artifacts-lumine-backlog.log','backlog.log'],
 ['.artifacts-lumine-guidance.log','guidance.log'],['.artifacts-lumine-hybrid.log','hybrid-temp-failure.log'],
 ['.artifacts-lumine-hybrid-render.log','hybrid-encoding-failure.log'],['.artifacts-lumine-hybrid-render-r2.log','hybrid-api-failure.log']
 ])archive(source,name);
archive('.artifacts/lumine-idle/visual-210-final-r2/receipt.json','capture-210.json');
archive('.artifacts/lumine-idle/visual-baseline-final/receipt.json','capture-baseline.json');
const service=read('.artifacts/lumine-idle/live-210-one/service.json');
const text=`# 荧战斗待机：可试玩原生候选，默认替换 NO-GO

本机试玩：${service.url}/ 。只供同源技术候选评审，未部署、未发布。底线是保留已批准人物，而不是把更复杂的小人作为完成品。

![真实1280×720战斗截图](battle-actual.png)

![左：批准源图；中：旧57图元；右：实际候选裁切](quality-comparison.png)

![左静态，右为实际Simulator 2.2秒待机](idle-actual.gif)

## 结论与取舍

**不替换正式皮肤，不合并发布。** 210px候选保住原构图、脸、花饰、服饰与剑；自然呼吸是批准动作的一阶横带近似，不是GIF直接导入或逐帧精确复播。它的首次完整显示与浏览器交互成本过高。133px方案虽便宜一些，细节退化仍明显；768混合图元规范输出已失去脸/服饰细节，视觉FAIL，未继续包装成战斗定稿。最优已测替代为保留210px可试玩候选和原正式皮肤，明确NO-GO，不以低画质强行完成。

现有公开离线API、本机图片目录和编码器未证实可用的自定义原图纹理入口。静态引用、变量图片、染色/3宫格/9宫格及官方材质不能证明可直接导入批准PNG/GIF。该结论限本机已核实工具与文档；不宣称平台永远不支持。原生图片分类共1590项，未找到有证据的本原图资源。复用已有混合拟合器实做768个椭圆/矩形/三角形；下图为编辑器规范绘制输出，非源图透明度裁切预览，亦非官方客户端截图。

![768混合图元：视觉拒绝](hybrid-768-rejected.png)

## 同条件负载与性能

基线为最新origin/develop 3a061a76加在途#621 680be9c5。三候选使用同一最终运行时、相同十牌/双敌/三药水夹具；CPU轮次旧→133→210→旧，独立进程，不截图。只改启动夹具的明确准备步骤，Run/Combat定义、输入与反馈机制不变。固定SDK导出、原指纹renderer和typed snapshot扩展，不能称未修改SDK或官方客户端。

| SDK项目 | 旧小人两轮 | 133px对照 | 210px候选 |
|---|---:|---:|---:|
| 图片图元 | 57 | 3439 | 7303 |
| 角色实际拥有控件 | 59 | 3532 | 7459 |
| 整页暖态控件 | 13812 | 17285 | 21212 |
| 创建后至完整显示CPU墙钟 | 126.30 / 89.47 ms | 1646.41 ms | 3866.01 ms |
| 同阶段SDK步数 | 2 / 2 | 76 | 159 |
| 稳态120步P50 | 8.07 / 9.64 ms | 6.59 ms | 8.16 ms |
| 稳态120步P95 | 13.10 / 15.27 ms | 8.05 ms | 12.50 ms |
| 待机2秒实际父容器写调用 | 0 / 0 | 2160 | 2160 |
| 待机2秒新建控件 | 0 / 0 | 0 | 0 |
| 根销毁后控件 | 0 / 0 | 0 | 0 |

角色控件数含图片、18个band父容器和分组；57不是硬上限。调用计数为末尾独立插桩stage，主表稳态计时不含插桩；原始全局sdkStepMs包含它，不能当纯生产耗时。全部轮次真实拖牌、取消、出牌、消耗、结束回合、20次各牌堆/卡库/地图往返通过，无运行时fault。缓存往返后无持续控件增长；不据此声称零内存泄漏。

真实浏览器使用Intel Iris Xe / ANGLE D3D11，先旧后新，性能轮不截图。8次孤立拖动输入→首次实际绘制，中位数 **39.10→87.50ms**（旧33.3–64.1ms；新73.3–117.3ms）。48次连续移动实际变更绘制 **41→10帧**，墙钟1.271→0.979s，受原leading16合并影响，不能换算设备FPS。三次真实攻击松手→飞牌旧134.9–173.1ms、新226.8–280.7ms；松手→HP绘制旧182.5–228.1ms、新266.3–390.1ms。两组均真实打出三张攻击、手牌10→7、能量3→0、敌HP32→14，无pageerror且停止成功。页面首个正帧7.49/7.57s之后，角色完整可见再等0.58/14.93s。样本有限，不把稳态CPU接近解释为GPU或手机流畅。

## 动作、身份与验证边界

实际截图固定1280×720，20个110ms样本加第21个闭合帧，实测模拟时钟差2.2s。源媒体字节未改。脚部父容器位置/缩放不动的VM合同通过，但实际像素严格不变量**FAIL**：21帧鞋/小腿裁切中最多15/3个通道值变化；闭合帧与首帧人物区域有84个通道值变化。少量边缘变化保留为失败证据，不删除断言或冒称像素完全静止。可见运动与静态图见GIF、关键帧及visual-measurements.json。Owner尚未对本次实际尺寸原生效果批准。

候选build **${summary.candidate.buildId}**，GIL SHA256 **${summary.candidate.sha256}**，361个Lua模块全部逐字读回；实际模板、控件及有效属性反向核对14082节点，faults=0。修正预览比较器对未启用自适应字号的无效minFontSize误报，同时严格比较autoSize，未改游戏字体或卡面。社区静态检查0错误、377告警与同源码基线一致；保留完整诊断，不冒称官方接受。切片涉及的两个告警是项目自有release/battlePose方法未被社区检查器识别。

最终相关回归**43/43通过**，覆盖现有缓存/生命周期、反馈/开关及新增暂停/释放重入；现有工程门禁、关键变异、原生UI合同6项、Backlog与guidance通过。早期36项、7项及4项定向日志也保留，不将重叠用例相加。完整Full/精确合并准入未完成，PR保持候选评审状态。独审先发现并修复同步pause后继续写入、父收据错误计数两个问题，修复及真实复核保留追溯记录。

**官方导入、当前候选官方ready、官方PC/真实手机、官方容量均UNVERIFIED。** 本轮未运行原神/沙箱，未取得本轮键鼠窗口，没有使用旧日志或设备结果，不自动发布。SDK墙钟、图元数、GIL字节不等于官方容量或GPU FPS。

复现入口：../../../experiments/lumine-idle/README.md 。原始报告及收据gzip附后；初始失败、重跑和严格像素FAIL均保留。SDK、上游工具未修改或打包分发；来源与许可延续项目LICENSE、原图权利说明及Primitive MIT运行时。
`;
fs.writeFileSync(out+'/README.md',text,'utf8');
const manifest={kind:'lumine-native-idle-evidence',conclusion:summary.conclusion,buildId:summary.candidate.buildId,gilSha256:summary.candidate.sha256,
 sdkSha256:perf['210'].sdkSha256,rendererSha256:browsers.candidate.rendererSha,files:[]};
for(const name of fs.readdirSync(out).filter(n=>n!=='manifest.json')){const bytes=fs.readFileSync(out+'/'+name);manifest.files.push({name,bytes:bytes.length,sha256:hash(bytes)});}
fs.writeFileSync(out+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({out,files:manifest.files.length,conclusion:summary.conclusion,url:service.url}));
