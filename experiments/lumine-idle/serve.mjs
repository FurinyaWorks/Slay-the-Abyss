// Keep #621's fingerprinted server/renderer and candidate validation unchanged.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2),at=args.indexOf('--output');if(at<0)throw Error('--output required');
const out=path.resolve(args[at+1]);fs.mkdirSync(out,{recursive:true});
let source=fs.readFileSync('experiments/battle-stage-review/serve.mjs','utf8');
// This character comparison needs one pressure fixture. Avoid retaining two
// full 26MB project graphs per service just to offer the five-card variant.
const cases=/const cases=\[[\s\S]+?\];\r?\nfor\(const c of cases\)/;
if(!cases.test(source))throw Error('Unexpected stage fixture declaration');
source=source.replace(cases,"const cases=[{name:'ten',file:'hud.save.json',title:'十牌双敌 · 荧待机候选',description:'保留真实出牌、牌堆、药水和整人反馈。'}];\nfor(const c of cases)");
source=source.replace("from './renderer-ticker-patch.mjs'","from "+JSON.stringify(pathToFileURL(path.resolve('experiments/battle-stage-review/renderer-ticker-patch.mjs')).href));
source=source.replaceAll('战斗页面 · 阶段评审','荧原生待机 · 技术候选')
 .replace('本轮牌堆与遗物详情候选；可实际游玩。','荧原生待机对照候选；可实际游玩，正式皮肤未替换。')
 .replace('请重点评审拖牌、红色瞄准线、连续出牌、药水和三个牌堆。','请重点比较荧的脸部、花饰、服饰、待机呼吸及出牌手感。')
 .replace('保留现有战斗路线，补齐三个牌堆浏览与战斗遗物详情。','保留现有玩法、卡面与整人攻击受击反馈。角色采用原图细节优先的静态图元缓存与同周期呼吸近似。')
 .replaceAll('本轮牌堆与遗物详情候选','本轮角色原生待机候选');
const file=path.join(out,'serve-entry.mjs');fs.writeFileSync(file,source);await import(pathToFileURL(file));
