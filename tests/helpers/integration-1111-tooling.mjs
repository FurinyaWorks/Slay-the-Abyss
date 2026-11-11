import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const bytes=readFileSync(new URL('../fixtures/integration-1111-tooling.json',import.meta.url));
if(hash(bytes)!=='33cb2a7b903996de898cdb44ead70d03a7a48c4048c53de9c6151863db347458')throw Error('Invalid integration tooling witness');
export const toolingProof=JSON.parse(bytes);
export function preIntegrationCalibrationSource(path,source){
 if(path!=='tests/ci-complete-calibration.test.mjs'||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const row=toolingProof.calibration,lf=source.replaceAll('\r\n','\n');
 if(lf!==row.after||hash(lf)!==row.afterSha256)return source;
 if(hash(row.before)!==row.beforeSha256)throw Error('Invalid calibration predecessor');
 return row.before;
}
// Only immutable receipt input authentication uses this view. Production and
// current CI execute the new tools; foreign/partial source remains visible.
export function receiptToolingSource(path,source,view){
 const allowed=view==='official'&&path==='scripts/check-network-policy.mjs'||view==='curses'&&path==='scripts/lua-quality-metrics.mjs';
 if(!allowed||typeof source!=='string'||source.includes('\r\r\n'))return source;
 const row=toolingProof.files[path],lf=source.replaceAll('\r\n','\n');
 if(hash(lf)!==row.afterSha256||lf!==row.after)return source;
 if(hash(row.before)!==row.beforeSha256)throw Error('Invalid frozen tooling predecessor');
 return row.before;
}
