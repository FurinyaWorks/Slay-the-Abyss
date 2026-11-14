import {preCloseoutCiSource,closeoutInventory,closeoutRead} from './closeout-ci-source.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const historyBytes=readFileSync(new URL('../fixtures/pr-history-receipt-continuation.json',import.meta.url));
if(hash(historyBytes)!=='b1285eef27a83f1296f2ed9e7f5a5d3f1a3dd118b14935044532104833a91717')throw Error('Invalid history receipt continuation');
const historyProof=JSON.parse(historyBytes);
for(const side of ['before','after'])if(hash(historyProof[side].source)!==historyProof[side].sha256)throw Error('Invalid complete history receipt source');
const bytes=readFileSync(new URL('../fixtures/integration-1111-tooling.json',import.meta.url));
if(hash(bytes)!=='33cb2a7b903996de898cdb44ead70d03a7a48c4048c53de9c6151863db347458')throw Error('Invalid integration tooling witness');
export const toolingProof=JSON.parse(bytes);
export function preIntegrationCalibrationSource(path,source){
 if(path==='tests/ci-complete-calibration.test.mjs')source=preCloseoutCiSource(path,source,'pr620');
 if(path!=='tests/ci-complete-calibration.test.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const row=toolingProof.calibration,lf=source.replaceAll('\r\n','\n');
 if(lf!==row.after||hash(lf)!==row.afterSha256)return source;
 if(hash(row.before)!==row.beforeSha256)throw Error('Invalid calibration predecessor');
 return row.before;
}
// Only immutable receipt input authentication uses this view. Production and
// current CI execute the new tools; foreign/partial source remains visible.
export function receiptToolingSource(path,source,view){
 if(view==='official'&&path===historyProof.path&&typeof source==='string'&&!source.includes('\r\r\n')){
  const lf=source.replaceAll('\r\n','\n');
  if(lf===historyProof.after.source&&hash(lf)===historyProof.after.sha256)return historyProof.before.source;
 }
 const allowed=view==='official'&&path==='scripts/check-network-policy.mjs'||view==='curses'&&path==='scripts/lua-quality-metrics.mjs';
 if(allowed)source=preCloseoutCiSource(path,source,'pr620');
 if(!allowed||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const row=toolingProof.files[path],lf=source.replaceAll('\r\n','\n');
 if(hash(lf)!==row.afterSha256||lf!==row.after)return source;
 if(hash(row.before)!==row.beforeSha256)throw Error('Invalid frozen tooling predecessor');
 return row.before;
}
