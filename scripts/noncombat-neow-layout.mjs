// Frozen blessing.png composition: guide on the right, speech above left-hand
// choices. Uses the battle scene's existing bounded polygon/native adapter.
import {applyStsNeowChoices} from './sts-neow-choice-layout.mjs';
import {approvedNeowGuide} from './sts-neow-guide-layout.mjs';
const parts=n=>n?.controls??n?.children??[];
const child=(n,name)=>parts(n).find(c=>c.name===name);
export function applyOfficialNeowLayout(layout,theme){
 const stage=child(layout,'stage')??layout,event=child(child(stage,'nodePanel'),'eventView');
 if(!event)return layout;
 const figure=child(event,'neowFigure');if(!figure)return layout;
 const [canvasWidth,canvasHeight]=theme.canvas.base,hud=theme.officialAssets.battleHud;
 const bodyTop=canvasHeight/2-(hud.y-hud.height/2);
 const image=(name,position,size,id,colour,extra={})=>({name,kind:'image',position,size,image:id,colour,...extra});
 figure.children=[
  // One HUD geometry source: even a one-pixel gap exposes old nodeBackdrop's
  // gold texture. Derive the screen-space bottom from the actual shared HUD.
  image('scene',[0,-bodyTop/2],[canvasWidth,canvasHeight-bodyTop],theme.image.rect,'#101C1C'),
  {name:'masonry',kind:'container',position:[0,0],size:[1280,720],children:Array.from({length:56},(_,i)=>{
   const row=Math.floor(i/8),col=i%8;
   const x=-560+col*160+(row%2?60:0),left=Math.max(-640,x-77),right=Math.min(640,x+77);
   return image('stone'+i,[(left+right)/2,249-row*64],[right-left,62],theme.image.rect,['#252B25','#202922','#293027'][i%3]);
  })},
  image('floor',[0,-250],[1280,220],theme.image.rect,'#344238'),
  ...[0,1,2].map(i=>image('floorJoint'+i,[0,-207-i*68],[1280,3],theme.image.rect,'#111F1E')),
  ...[0,1].flatMap(i=>[
   image('torchGlow'+i,[-235+i*250,150+i*30],[200,200],theme.image.glow,'#F6AC37',{opacity:.4}),
   image('torchStem'+i,[-235+i*250,178+i*45],[12,48],theme.image.rect,'#111C1C'),
   image('torchFlame'+i,[-235+i*250,220+i*45],[16,30],theme.image.discSoft,'#FFE39A'),
  ]),
  approvedNeowGuide(theme),
 ];
 // Keep the existing bubble, title/body fields, four option transactions and
 // delayed/reward paths. The native autosizer handles variable blessing copy.
 const bubble=child(event,'bubble');bubble.image=theme.image.discSoft;
 bubble.colour='#C9E3DE';bubble.opacity=1;
 bubble.position=[-45,96];bubble.size=[310,160];
 applyStsNeowChoices(event,theme);
 return layout;
}
