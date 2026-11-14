import {readFileSync} from 'node:fs';
const child=(n,key)=>(n?.controls??n?.children??[]).find(c=>c.name===key);
export function loadLowCostArt(){
 const result={};
 for(const [kind,capacity]of [['relic',16],['enemy',32]]){
  const source=JSON.parse(readFileSync(new URL(`../data/presentation/lowcost-${kind}-art.json`,import.meta.url),'utf8'));
  if(source.schemaVersion!==1||source.canvas!==100||source.capacity!==capacity||!Object.keys(source.assets??{}).length)throw Error('Invalid low-cost artwork registry: '+kind);
  for(const [id,asset]of Object.entries(source.assets)){
   if(!asset.name||!Array.isArray(asset.shapes)||!asset.shapes.length||asset.shapes.length>capacity)throw Error('Invalid artwork capacity: '+id);
   for(const shape of asset.shapes)if(![100001,100002,100003].includes(shape.image)||
    ![shape.x,shape.y,shape.w,shape.h,shape.rotation??0].every(Number.isFinite)||shape.w<=0||shape.h<=0||
    Math.abs(shape.x)+shape.w/2>72||Math.abs(shape.y)+shape.h/2>72||!/^#[0-9a-f]{6}$/i.test(shape.colour))throw Error('Invalid artwork shape: '+id);
  }
  result[kind]=source;
 }
 return result;
}
function pool(icon,capacity){return {name:icon.name+'Art',kind:'container',position:[...(icon.position??[0,0])],size:[100,100],visible:false,raycastTarget:false,
 children:Array.from({length:capacity},(_,i)=>({name:'shape'+i,kind:'image',size:[1,1],image:100001,colour:'#FFFFFF',visible:false,raycastTarget:false}))};}
export function attachLowCostArt(tree){
 function walk(node,path=''){
  path+='/'+node.name;const children=node.controls??node.children??[];
  for(const c of [...children])walk(c,path);
  const portrait=child(node,'portrait');
  if(portrait&&node.name==='AbyssMonsterActor'&&!child(node,'portraitArt'))children.splice(children.indexOf(portrait)+1,0,pool(portrait,32));
  const icon=child(node,'icon');
  const relic= /\/relicBar\/slot\d+$/.test(path)||/\/relicPanel\/(row\d+\/slot|single)$/.test(path)||
   /\/shopView\/relic\d+$/.test(path)||/\/treasureView\/(reward|rewardItem\d+)$/.test(path);
  if(icon&&relic&&!child(node,'iconArt'))children.splice(children.indexOf(icon)+1,0,pool(icon,16));
 }
 walk(tree);return tree;
}
