// Standalone headless reference render; never controls the user's desktop.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import{createRequire}from'node:module';
const out=path.resolve(process.argv[2]);assert(out,'output required');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('docs/design/reference-ui-lab/blessing.js','utf8');
const svg=source.match(/function guide\(\)\{return `([\s\S]*?)`\}/)?.[1];assert(svg,'approved guide SVG missing');
const{chromium}=createRequire('C:/Users/Administrator/AppData/Roaming/npm/node_modules/playwright/package.json')('playwright');
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Users/Administrator/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file=>fs.existsSync(file));assert(executablePath,'installed headless browser required');
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.setContent(`<style>body{margin:0;background:#101c1c;width:1280px;height:720px;overflow:hidden}.sts-guide{position:absolute;right:-26px;top:55px;width:567px;height:580px}</style>${svg}`);
 await page.screenshot({path:path.join(out,'approved-guide-position.png')});
 // Full source SVG in situ is the independent reference. Candidate mask comes
 // from the real SDK screenshot, not this hand-built browser DOM.
 fs.writeFileSync(path.join(out,'reference.json'),JSON.stringify({source:'docs/design/reference-ui-lab/blessing.js guide()',css:'sts-menus-restore.css .sts-guide',canvas:[1280,720],cssBox:[739,55,567,580],viewBox:[600,600],meet:{scale:567/600,origin:[739,61.5]},nativeGradientParity:'UNVERIFIED',officialClient:'not_run'},null,2));
}finally{await browser.close();}
