// Scene construction from the user supplied menu_reference.png only.
// Static 2D layers follow production-25d; polygons use the existing V25 converter.
import {polygon} from './v25-node-layout.mjs';
const group=(name,children)=>({name,kind:'container',size:[1280,720],children});
const image=(name,x,y,w,h,colour,id=100001,extra={})=>({name,kind:'image',position:[x-640,360-y],size:[w,h],image:id,colour,...extra});
const line=(name,a,b,width,colour,extra={})=>image(name,(a[0]+b[0])/2,(a[1]+b[1])/2,Math.hypot(b[0]-a[0],b[1]-a[1]),width,colour,100001,{rotation:-Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI,...extra});
export function menuRuinsScene(){
 const sky=group('atmosphere',[]),far=group('distantRuins',[]),middle=group('middleRuins',[]),stone=group('brokenMonolith',[]),front=group('stairsAndForeground',[]);
 // Broad atmospheric bands, blended by native soft edges rather than raster tiles.
 sky.children.push(image('sky',640,360,1280,720,'#809BB5'));
 sky.children.push(image('horizon',850,570,1500,690,'#C2D7DF',100002,{opacity:.8,feather:{pixels:[160,160]}}));
 sky.children.push(image('sunlitAir',1150,220,600,500,'#E4DFD4',100002,{opacity:.48,feather:{pixels:[160,130]}}));
 sky.children.push(image('cloud',1150,220,440,140,'#EEF0E9',100002,{opacity:.72,feather:{pixels:[70,40]}}));
 sky.children.push(image('cloudDrift',800,210,390,95,'#DAE5E7',100002,{opacity:.6,rotation:20,feather:{pixels:[90,30]}}));
 const poly=(layer,name,points,c)=>layer.children.push(polygon(name,points,c));
 // Background piers recede in size and contrast. The arch crowns are native ellipses.
 function arcade(layer,name,x,y,count,step,height,colour,hole){
  layer.children.push(line(name+'deck',[x-25,y-37],[x+count*step,y+count*step*.29-37],15,colour));
  for(let i=0;i<count;i++){
   const cx=x+i*step,cy=y+i*step*.29;
   layer.children.push(image(name+'pier'+i,cx,cy+height/2,12,height,colour));
   layer.children.push(image(name+'arch'+i,cx+step/2,cy,step+2,80,colour,100002,{fill:{shape:'vertical',from:'top',amount:.5}}));
   layer.children.push(image(name+'opening'+i,cx+step/2,cy+3,step-21,65,hole,100002,{fill:{shape:'vertical',from:'top',amount:.5}}));
  }
 }
 arcade(far,'aqueduct',480,263,4,82,200,'#7896AB','#A3BCCB');
 arcade(far,'rightAqueduct',1108,314,2,86,180,'#91AABD','#C0CFD6');
 poly(far,'floatingRock',[[635,143],[727,166],[676,219],[664,172]],'#607F98');
 far.children.push(image('farFog',830,510,1250,360,'#BAD0DA',100002,{opacity:.85,feather:{pixels:[160,90]}}));
 arcade(middle,'lowerBridge',305,489,4,102,195,'#536E83','#9EB8C9');
 middle.children.push(image('bridgeMist',697,640,1180,340,'#ACC6D5',100002,{opacity:.8,feather:{pixels:[120,90]}}));
 poly(middle,'brokenPillar',[[421,512],[461,390],[492,337],[516,329],[530,350],[499,563]],'#476277');
 // The slab is a perspective silhouette, with an exposed pale broken upper edge.
 poly(stone,'slab',[[775,506],[923,100],[1081,37],[1120,106],[1086,346],[1032,465],[946,536]],'#3C5367');
 poly(stone,'side',[[1081,37],[1120,106],[1086,346],[1061,371]],'#A6ADB1');
 poly(stone,'lightTop',[[923,100],[1081,37],[1092,43],[928,108]],'#D7D3C8');
 // An inset frame and diamond seal make this read as a carved stele, not a mountain.
 const frame=[[908,127],[1058,76],[1028,335],[843,405],[908,127]];
 frame.slice(1).forEach((p,i)=>stone.children.push(line('incisedFrame'+i,frame[i],p,2,'#74899A')));
 const seal=[[976,174],[988,220],[1013,237],[975,259],[955,308],[945,267],[914,252],[950,225],[976,174]];
 seal.slice(1).forEach((p,i)=>stone.children.push(line('seal'+i,seal[i],p,4,'#8FA4B3')));
 stone.children.push(image('sealCore',966,244,17,24,'#91ADBB',100001,{rotation:-30}));
 // Two uneven, connected cracks follow the reference and lead into the mist.
 const crack=[[862,514],[889,451],[881,421],[917,377],[934,322],[966,302],[998,292],[1027,270],[1056,278]];
 poly(stone,'brokenGap',[[917,377],[934,322],[1056,278],[971,315]],'#213B50');
 crack.slice(1).forEach((p,i)=>stone.children.push(line('cyanFissure'+i,crack[i],p,i<2?7:5,'#9CF3F2')));
 stone.children.push(image('fissureBloom',927,363,135,320,'#62E7EE',100002,{opacity:.20,rotation:-27,feather:{pixels:[55,80]}}));
 const upper=[[902,181],[908,148],[920,141],[923,120],[931,116]];
 upper.slice(1).forEach((p,i)=>stone.children.push(line('upperCrack'+i,upper[i],p,3,'#9DF3F0')));
 // Foreground platform conceals the foot of the slab. Stair treads expand toward us.
 poly(front,'ledge',[[785,555],[969,519],[1028,531],[1173,477],[1280,438],[1280,720],[777,720]],'#354C60');
 for(let i=0;i<10;i++){
  const y=510+i*18+i*i*.65,left=1110-i*24,right=1190+i*13;
  front.children.push(image('riser'+i,(left+right)/2,y+7,right-left,16,'#566C80'));
  front.children.push(line('tread'+i,[left,y],[right,y-2],4,i<5?'#C3BDB6':'#A6AAAC'));
 }
 front.children.push(image('lowMist',725,665,1000,210,'#B8D0DC',100002,{opacity:.64,feather:{pixels:[130,60]}}));
 poly(front,'leftMass',[[0,0],[149,0],[178,34],[165,115],[263,228],[219,314],[334,451],[0,553]],'#1D2D3C');
 front.children.push(image('leftAtmosphere',80,395,820,1000,'#1D3042',100002,{opacity:.96,feather:{pixels:[190,170]}}));
 poly(front,'nearRock',[[0,666],[88,639],[329,658],[452,720],[0,720]],'#1B2C3B');
 // Layer containers stay below 60 direct children and have no scripts or input targets.
 return group('menuRuinsScene',[sky,far,middle,stone,front]);
}
export function sceneInventory(root=menuRuinsScene()){
 const nodes=[];const walk=n=>{nodes.push(n);for(const c of n.children??[])walk(c)};walk(root);
 return {images:nodes.filter(n=>n.kind==='image').length,containers:nodes.filter(n=>n.kind==='container').length,maxChildren:Math.max(...nodes.map(n=>n.children?.length??0)),animatedControls:0};
}
