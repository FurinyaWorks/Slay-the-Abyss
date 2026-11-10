// Single-factor negative control: same save/art/seed/inputs; re-enable the old
// stable-room submission only. Never rewrite production modules for a benchmark.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const [file,out]=process.argv.slice(2),save=JSON.parse(fs.readFileSync(file));
const module=save.assets.scripts.find(s=>s.path==='abyss_map_ui.lua');
const needle='if fx.visible and (fx.state=="available" or fx.scale~=previousScale) then M.paintRoom(fx)end';
if(module.source.split(needle).length!==2)throw Error('Control no longer matches the exact guarded painter');
const hash=s=>createHash('sha256').update(s).digest('hex'),before=hash(module.source);
module.source=module.source.replace(needle,'if fx.visible then M.paintRoom(fx)end');
fs.writeFileSync(out,JSON.stringify(save));
fs.writeFileSync(out+'.receipt.json',JSON.stringify({scope:'single-factor duplicate-paint negative control; same visual save and input sequence',input:file,inputSha256:hash(fs.readFileSync(file)),moduleBeforeSha256:before,moduleAfterSha256:hash(module.source),replacement:needle},null,2));
