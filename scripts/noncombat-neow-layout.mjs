// Frozen blessing.png composition: guide on the right, speech above left-hand
// choices. Uses the battle scene's existing bounded polygon/native adapter.
import {nativeShape} from './v25-battle-scene.mjs';
const parts=n=>n?.controls??n?.children??[];
const child=(n,name)=>parts(n).find(c=>c.name===name);
export function applyOfficialNeowLayout(layout,theme){
 const stage=child(layout,'stage')??layout,event=child(child(stage,'nodePanel'),'eventView');
 if(!event)return layout;
 const figure=child(event,'neowFigure');if(!figure)return layout;
 const image=(name,position,size,id,colour,extra={})=>({name,kind:'image',position,size,image:id,colour,...extra});
 const shapes=[
  ['cloak',[[965,210],[1100,210],[1165,330],[1235,590],[1055,620],[900,582],[955,350]],'#344447'],
  ['leftFold',[[965,235],[1027,326],[1027,540],[917,573]],'#536264'],
  ['rightFold',[[1037,328],[1108,252],[1184,574],[1037,540]],'#526163'],
  ['hem',[[917,573],[1027,540],[1184,574],[1055,601]],'#263739'],
  ['leftSleeve',[[943,366],[981,399],[920,463],[883,440]],'#697776'],
  ['rightSleeve',[[1090,393],[1120,374],[1153,434],[1110,457]],'#697776'],
 ];
 figure.children=[
  image('scene',[0,-22],[1280,676],theme.image.officialBackdrops.act1_3,'#FFFFFF'),
  image('shade',[0,-22],[1280,676],theme.image.rect,'#081312',{opacity:.5}),
  image('hoodRim',[391,145],[238,268],theme.image.disc,'#76827D'),
  image('hoodVoid',[391,133],[185,220],theme.image.disc,'#0D1B20'),
  ...shapes.flatMap(([name,points,colour])=>nativeShape({name,type:'polygon',points,colour,opacity:1},theme)),
  image('clasp',[389,14],[24,36],theme.image.diamond,'#C5B878'),
  image('staff',[230,-143],[10,190],theme.image.rect,'#766F5A',{rotation:-5}),
  image('staffGem',[231,-64],[30,38],theme.image.rect,'#D3C790',{rotation:-5}),
 ];
 // Keep the existing bubble, title/body fields, four option transactions and
 // delayed/reward paths. The native autosizer handles variable blessing copy.
 const bubble=child(event,'bubble');bubble.image=theme.officialAssets.images.panel;
 bubble.colour='#C9E3DE';bubble.opacity=1;
 bubble.position=[-45,65];bubble.size=[310,160];
 return layout;
}
