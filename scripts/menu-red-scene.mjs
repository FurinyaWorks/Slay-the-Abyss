import {readFileSync} from 'node:fs';
import {flatTriangle} from './menu-flat-triangle.mjs';
const pack=JSON.parse(readFileSync(new URL('../data/presentation/native-menu-red.json',import.meta.url),'utf8'));
const group=(name,children)=>({name,kind:'container',size:[1280,720],children});
// A = R(u) diag(s1,s2) R(v). Parent scale/rotation and child rotation are
// ordinary 2D native transforms; one library triangle needs no stencil mask.
// The signed second singular value also handles reversed winding.
export function nativeMenuTriangle([left,right,tip],name,colour){
 const bottom=[(left[0]+right[0])/2,(left[1]+right[1])/2];
 const [a,c]=[right[0]-left[0],right[1]-left[1]],b=tip[0]-bottom[0],d=tip[1]-bottom[1];
 const xx=a*a+c*c,xy=a*b+c*d,yy=b*b+d*d;
 const angle=.5*Math.atan2(2*xy,xx-yy),s1=Math.sqrt((xx+yy+Math.hypot(xx-yy,2*xy))/2);
 if(!Number.isFinite(s1)||s1<1e-8)throw Error('Degenerate menu facet');
 const s2=(a*d-b*c)/s1,u=Math.atan2(c*Math.cos(angle)+d*Math.sin(angle),a*Math.cos(angle)+b*Math.sin(angle));
 return {name,kind:'container',position:[(tip[0]+bottom[0])/2,(tip[1]+bottom[1])/2],size:[1,1],rotation:u*180/Math.PI,scale:[s1/1024,s2/1024],children:[
  {name:'triangle',kind:'image',position:[0,0],size:[1024,1024],image:100003,colour,opacity:1,rotation:-angle*180/Math.PI},
 ]};
}
// One static, source-fitted scene. Keep the existing menu scenery handle so
// result/menu lifecycle ownership does not change. No runtime fitting/loading.
export function menuRedBackground(pack,compact=false){
 const kx=1280/pack.width,ky=720/pack.height;
 const images=pack.shapes.map((s,i)=>{
  if(s.type==='rect'||s.type==='ellipse')return {name:'facet'+i,kind:'image',position:[(s.box[0]+s.box[2]/2)*kx-640,360-(s.box[1]+s.box[3]/2)*ky],size:[s.box[2]*kx,s.box[3]*ky],image:s.type==='ellipse'?100002:100001,colour:s.colour};
  if(s.type!=='polygon'||s.points.length!==3)throw Error('Menu fit must contain rectangles or triangles');
  const points=s.points.map(([x,y])=>[x*kx-640,360-y*ky]);
  return (compact&&flatTriangle(points,'facet'+i,s.colour))||nativeMenuTriangle(points,'facet'+i,s.colour);
 });
 if(images.length>1800)throw Error('Menu native image budget exceeded');
 const batches=Array.from({length:Math.ceil(images.length/60)},(_,i)=>group('batch'+i,images.slice(i*60,(i+1)*60)));
 const result=group('menuRedBackground',batches);
 const count=n=>1+(n.children??[]).reduce((sum,c)=>sum+count(c),0);
 if(compact&&count(result)>1800)throw Error('Total menu background control budget exceeded');
 return result;
}
export function menuRedScene(){return group('menuRuinsScene',[menuRedBackground(pack,pack.nativeMode==='single-axis-static-xyz')]);}
