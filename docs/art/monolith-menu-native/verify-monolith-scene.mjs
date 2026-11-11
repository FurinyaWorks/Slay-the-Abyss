import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const root=dirname(fileURLToPath(import.meta.url));
const scene=JSON.parse(readFileSync(resolve(root,'scene-monolith-menu.json'),'utf8'));
const camera=JSON.parse(readFileSync(resolve(root,'camera-contract.json'),'utf8'));
const allowed=new Set([20001043,20001044,20001711,20001874,20002083,20002586,20002899,20002902,20003078]);
assert.equal(scene.install,false);assert.equal(scene.name,'Abyss_Menu_Monolith_NativeV1');
assert.ok(scene.blocks.length>=20&&scene.blocks.length<=32);
assert.equal(new Set(scene.blocks.map(b=>b.name)).size,scene.blocks.length);
for(const b of scene.blocks){
 assert.ok(b.name.startsWith('ARTMENU_'));assert.ok(allowed.has(b.template));
 assert.equal(b.solid,false);assert.ok(Array.isArray(b.position)&&b.position.length===3&&b.position.every(Number.isFinite));
 assert.notEqual(Object.hasOwn(b,'scale'),Object.hasOwn(b,'size'));
 if('scale'in b)assert.ok(Number.isFinite(b.scale)&&b.scale>0&&b.scale<=3);
 if('size'in b)assert.ok(Array.isArray(b.size)&&b.size.length===3&&b.size.every(v=>Number.isFinite(v)&&v>0));
 if('rotation'in b)assert.ok(b.rotation.length===3&&b.rotation.every(Number.isFinite));
 assert.deepEqual(Object.keys(b).filter(k=>!['template','name','position','scale','size','rotation','solid'].includes(k)),[]);
}
assert.equal(scene.blocks.filter(b=>b.name.startsWith('ARTMENU_Step')).length,8);
assert.ok(scene.blocks.filter(b=>b.name.startsWith('ARTMENU_Tablet')).length>=6);
assert.equal(scene.blocks.filter(b=>b.template===20001874).length,2);
assert.equal(camera.artOnly,true);assert.equal(camera.officialDeviceVerified,false);
assert.ok(camera.distance>=15&&camera.distance<=30&&camera.fieldOfView>=35&&camera.fieldOfView<=55);
assert.equal(camera.fixedView.ignoreCollision,true);assert.equal(camera.fixedView.yaw,0);
console.log('PASS: '+scene.blocks.length+' source-backed native models, no auto-install or collisions. GIA/device remain UNVERIFIED.');
