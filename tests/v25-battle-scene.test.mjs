import test from 'node:test';
import assert from 'node:assert/strict';
import {battleLayout} from '../scripts/ui-layout.mjs';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {withViewport} from '../scripts/viewport-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {assertNativeUiCapacity} from '../scripts/build-ui.mjs';
import {applyV25BattleScene,buildV25BattleSceneGeometry,v25SceneSource,nativeSceneEdgeBleed} from '../scripts/v25-battle-scene.mjs';

const nodes=node=>node.controls??node.children??[];
const child=(node,name)=>nodes(node).find(item=>item.name===name);
const all=node=>[node,...nodes(node).flatMap(all)];

test('canonical V25 scene retains the gate, both walls, perspective floor and three rock formations',()=>{
 const layers=buildV25BattleSceneGeometry(),layer=name=>layers.find(item=>item.name===name);
 assert.match(v25SceneSource.sha256,/^[a-f0-9]{64}$/);
 assert.equal(v25SceneSource.record,'battle.js:72 scene(false)');
 const walls=layer('walls').shapes;
 assert.equal(walls.length,4);assert(walls[0].points.some(([x])=>x===0));assert(walls[1].points.some(([x])=>x===1280));
 const arch=layer('gate').shapes.find(item=>item.name==='arch');
 assert(arch.points.some(([x,y])=>x===489&&y===337));assert(arch.points.some(([x,y])=>x===791&&y===337));
 assert(Math.min(...arch.points.map(p=>p[1]))<110,'monumental curved arch was flattened');
 assert(arch.points.some(([x,y])=>x===519&&y===337),'doorway interior lost');
 assert.equal(layer('rubble').shapes.length,3);
 assert(layer('perspective').shapes.length>=10);
 const floor=layer('floor').shapes.find(item=>item.name==='horizon');
 assert(floor.points.length>20&&floor.points.some(p=>p[1]<410),'curved floor horizon lost');
});

test('native scene is static, uses bounded semantic layers and preserves every functional object',()=>{
 const layout=battleLayout(),root=child(layout,'stage'),original=[...root.children];
 applyV25BattleScene(layout,nativeTheme);
 const scene=root.children[0];assert.equal(scene.name,'v25BattleScene');
 assert.deepEqual(scene.size,[1280,676]);assert.deepEqual(scene.position,[0,-22]);
 assert.deepEqual(root.children.slice(1),original);
 for(const before of original)assert.equal(child(root,before.name),before);
 assert.equal(root.children.filter(item=>/^card\d+$/.test(item.name)).length,10);
 const flat=all(scene);assert(flat.length>60&&flat.length<650,'scene must be geometry, not a pixel raster');
 for(const node of flat){
  assert(nodes(node).length<=60);assert(!node.script&&!node.scripts&&!node.focusable);
  assert(['container','image'].includes(node.kind));
  if(node.kind==='image'){assert(node.size.every(value=>value>0));assert([100001,100003,106095,nativeTheme.image.glowWide,nativeTheme.image.vignette].includes(node.image));}
 }
 const triangles=flat.filter(node=>node.image===100003);
 assert(triangles.length>20);
 for(const triangle of triangles){assert.deepEqual(triangle.fill,{shape:'horizontal',from:'right',amount:.5});assert.deepEqual(triangle.pivot,[.5,0]);}
 assertNativeUiCapacity(layout);
});

test('haze uses the observed transparent radial glow and vignette retains its own edge-only material',()=>{
 const layout=battleLayout();applyV25BattleScene(layout,nativeTheme);
 const scene=child(child(layout,'stage'),'v25BattleScene');
 const haze=child(child(scene,'haze'),'distantLight'),edge=child(child(scene,'vignette'),'edgeShade');
 assert.equal(haze.image,nativeTheme.image.glowWide,'106029 is a solid plate, not a transparent haze');
 assert.equal(haze.opacity,.24);assert.equal(edge.image,nativeTheme.image.vignette);assert.equal(edge.opacity,.57);
 assert.notEqual(haze.image,edge.image,'light and edge shade cannot share an opaque full-screen plate');
 assert.equal(v25SceneSource.plateSheetSha256,'dc4fb4dc149a65e57831920cfdd40e7159a6a54c488facca18127e16c1a0cd7b');
});

test('sky and lower floor use continuous native fades instead of visible solid-color bands',()=>{
 const layout=battleLayout();applyV25BattleScene(layout,nativeTheme);
 const scene=child(child(layout,'stage'),'v25BattleScene'),sky=child(scene,'sky');
 assert.equal(sky.children.length,3);
 assert.equal(child(sky,'upperSky').image,106095);assert.equal(child(sky,'upperSky').rotation,180);
 assert.equal(child(sky,'lowerSky').image,106095);assert.equal(child(sky,'lowerSky').rotation,0);
 const floor=all(child(scene,'floor'));assert.equal(floor.filter(node=>node.image===106095).length,1);
 assert(!floor.some(node=>/^floor\d+$/.test(node.name)),'discrete floor bands returned');
});

test('masked native triangle geometry conserves polygon area and leaves the gate opening clear',()=>{
 const layout=battleLayout();applyV25BattleScene(layout,nativeTheme);
 const scene=child(child(layout,'stage'),'v25BattleScene');
 const polygonArea=points=>Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-a[1]*b[0];},0))/2;
 for(const layer of buildV25BattleSceneGeometry())for(const shape of layer.shapes.filter(item=>item.type==='polygon')){
  const triangles=all(child(scene,layer.name)).filter(node=>node.name.startsWith(shape.name+'Tri'));
  // The visible native triangles deliberately overlap by subpixel bleed.
  // Remove that explicit raster margin before checking exact source geometry.
  assert.equal(nativeSceneEdgeBleed,.45);
  assert(triangles.every(node=>node.opacity===1),'translucent triangulation seams returned');
  const nativeArea=triangles.reduce((sum,node)=>sum+(node.size[0]/2-nativeSceneEdgeBleed*3)*(node.size[1]-nativeSceneEdgeBleed*3)/2,0);
  assert(Math.abs(nativeArea-polygonArea(shape.points))<1e-5,`${layer.name}/${shape.name} lost geometric area`);
 }
 const gateTriangles=all(child(scene,'gate')).filter(node=>node.name.startsWith('archTri'));
 const vertices=node=>[[0,0],[node.size[0]/2,0],[0,node.size[1]*node.scale[1]]].map(([x,y])=>{
  const a=node.rotation*Math.PI/180;
  const nx=node.position[0]+x*Math.cos(a)-y*Math.sin(a),ny=node.position[1]+x*Math.sin(a)+y*Math.cos(a);
  return [nx+640,338-ny];
 });
 const contains=(triangle,point)=>Math.abs(polygonArea(triangle)-triangle.reduce((sum,a,i)=>sum+polygonArea([a,triangle[(i+1)%3],point]),0))<1e-5;
 assert(gateTriangles.some(node=>contains(vertices(node),[640,120])),'curved arch crown lost');
 assert(!gateTriangles.some(node=>contains(vertices(node),[640,250])),'arch adapter filled the doorway');
});

test('wrapped game replaces only the old battle scene and retains selection/menu backgrounds',()=>{
 const layout=withViewport(gameLayout(),nativeTheme),stage=child(layout,'stage'),battle=child(stage,'battlePanel');
 const old={name:'lowpolyScene',kind:'container',children:[]};battle.children.unshift(old);
 const menu=child(stage,'menuPanel'),selection=child(stage,'characterPanel');
 const menuBefore=structuredClone(menu),selectionBefore=structuredClone(selection);
 const hit=child(child(battle,'drawIcon'),'hit');
 applyV25BattleScene(layout,nativeTheme);
 assert.equal(battle.children[0].name,'v25BattleScene');assert(!child(battle,'lowpolyScene'));
 assert.equal(child(child(battle,'drawIcon'),'hit'),hit);
 assert.deepEqual(menu,menuBefore);assert.deepEqual(selection,selectionBefore);
 assertNativeUiCapacity(layout);
});

test('duplicate application and unsupported scene roots refuse without changing input',()=>{
 const layout=battleLayout();applyV25BattleScene(layout,nativeTheme);
 const before=structuredClone(layout);assert.throws(()=>applyV25BattleScene(layout,nativeTheme),/already/);assert.deepEqual(layout,before);
 const invalid={controls:[{name:'stage',kind:'container',children:[]}]},copy=structuredClone(invalid);
 assert.throws(()=>applyV25BattleScene(invalid,nativeTheme),/battle/);assert.deepEqual(invalid,copy);
});

test('canonical geometry and native instances do not share mutable state',()=>{
 const before=buildV25BattleSceneGeometry(),first=battleLayout(),second=battleLayout();
 applyV25BattleScene(first,nativeTheme);applyV25BattleScene(second,nativeTheme);
 const native=child(child(first,'stage'),'v25BattleScene');native.children[0].children[0].colour='#FF0000';
 assert.notDeepEqual(native,child(child(second,'stage'),'v25BattleScene'));
 assert.deepEqual(buildV25BattleSceneGeometry(),before);
});
