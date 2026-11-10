// Independent native geometry from the authorized V25 layout/color reference:
// dist/sts-battle-restore.css SHA256 bee6138f43655ffc62ce0c0860bfacf6050fbae7bd702227a472c571c0e13f92.
// No private texture/code is embedded. Native gradients, font and soft edges are
// approximations pending same-candidate visual/device review, not V25 equivalence.
// Host/hit rectangles and live text identities belong to the existing controller.
const states=['normal','hover','pressed','disabled'];
const children=node=>node.controls??node.children??[];
const requireChild=(node,name)=>{
 const matches=children(node).filter(child=>child.name===name);
 if(matches.length!==1)throw Error(`V25 battle chrome requires exactly one ${name}`);
 return matches[0];
};
const group=(name,size,items)=>({name,kind:'container',position:[0,0],size:[...size],children:items});
const image=(name,size,id,colour,position=[0,0],extra={})=>({name,kind:'image',position:[...position],size:[...size],image:id,colour,...extra});

function rounded(name,width,height,radius,colour,theme){
 return group(name,[width,height],[
  image('vertical',[width-radius*2,height],theme.image.rect,colour),
  image('horizontal',[width,height-radius*2],theme.image.rect,colour),
  ...[-1,1].flatMap(x=>[-1,1].map(y=>image(`corner${x}_${y}`,[radius*2,radius*2],theme.image.disc,colour,[x*(width/2-radius),y*(height/2-radius)]))),
 ]);
}

function hex(name,width,height,colour,theme){
 const wedge=width*.12;
 return [image(name,[width-wedge*2,height],theme.image.rect,colour),
  ...[-1,1].map(side=>image(name+(side<0?'Left':'Right'),[height,wedge],100003,colour,[side*(width/2-wedge/2),0],{rotation:side<0?90:-90})),
 ];
}

function turnChrome(state,size,theme){
 const [w,h]=size;
 const palette={normal:['#8F918B','#41484A','#38505C','#243942'],
  hover:['#B3B5AE','#515A5D','#466473','#2D4753'],
  pressed:['#6E7779','#30383C','#253D48','#192D36'],
  disabled:['#555A59','#373E40','#2B363A','#222D32']}[state];
 const elements=[...hex('rim',w,h,palette[1],theme),...hex('well',w-6,h-6,'#1A2C35',theme),
  ...hex('face',w-14,h-14,palette[3],theme)];
 // Two bounded native soft highlights model the upper metal/blue gradient.
 elements.push(image('rimLight',[w*.68,3],theme.image.rect,palette[0],[0,h/2-2],{feather:{pixels:[3,1]}}),
  image('faceLight',[w*.64,Math.max(2,(h-14)*.5)],theme.image.rect,palette[2],[0,(h-14)*.22],{feather:{pixels:[4,3]}}));
 return group('v25Chrome',size,elements);
}

function energyChrome(icon,theme){
 const size=icon.size[0],disc=theme.image.disc;
 // Shared semantic face/light/core/valueShadow survive the charged/empty writer.
 const ring=requireChild(icon,'face'),light=requireChild(icon,'light'),core=requireChild(icon,'core');
 ring.size=[size*.84,size*.84];
 light.size=[size*.64,size*.64];light.position=[-size*.05,size*.08];
 core.size=[size*.36,size*.36];
 const chrome=group('v25Chrome',icon.size,[
  image('aura',[size+16,size+16],theme.image.ring,'#EB8F30',[0,0],{rotation:25,opacity:.65,feather:{pixels:[2,2]}}),
  image('metal',[size-6,size-6],disc,'#C8BAA2'),
  image('darkRim',[size-12,size-12],disc,'#393238'),
  image('emberRim',[size-17,size-17],disc,'#852024'),
  image('ember',[size-24,size-24],disc,'#E84D12'),
  image('amber',[size*.62,size*.62],disc,'#FFAD20',[-size*.025,size*.04]),
  image('warmLight',[size*.58,size*.58],100002,'#FFF7A6',[-size*.05,size*.08],{feather:{pixels:[12,12]}}),
 ]);
 // The runtime-owned light sits above the new ornament and still hides at 0 energy.
 light.image=100002;light.feather={pixels:[14,14]};
 icon.children=[chrome,ring,light,core,requireChild(icon,'valueShadow')];
}

function pileChrome(pile,kind,theme){
 const draw=kind==='draw',scale=pile.size[0]/65,w=39*scale,h=49*scale;
 const palette=draw?['#A79C7E','#F2EAD0','#B65036','#B74028']:['#3B6A82','#79B7D0','#C4E2EB','#25536D'];
 // Keep the old image path valid but let the three rounded card backs own the look.
 requireChild(pile,'image').visible=false;requireChild(pile,'face').visible=false;
 requireChild(pile,'captionPlate').visible=false;
 for(const[name,offset,colour]of [['back2',[6*scale,-4*scale],draw?'#6F6D60':'#455C6A'],['back1',[3*scale,-scale],draw?'#A9A088':'#B3C6C8'],['front',[0,0],palette[0]]]){
  const card=requireChild(pile,name);card.position=offset;card.size=[w,h];card.rotation=draw?-16:13;
  card.children=[rounded('v25Card',w,h,3*scale,colour,theme)];
  if(name==='front')card.children.push(rounded('paper',w-4*scale,h-4*scale,2*scale,palette[1],theme),
   rounded('innerLine',w-10*scale,h-10*scale,scale,palette[2],theme),
   rounded('innerPaper',w-12*scale,h-12*scale,scale*.5,palette[1],theme));
 }
 const glyph=requireChild(pile,'glyph');glyph.colour=palette[3];glyph.size=[w*.65,h*.65];
 glyph.position=[0,0];glyph.rotation=draw?-16:13;
}

export function applyV25BattleChrome(layout,theme){
 // Production gameLayout is wrapped by withViewport; battleLayout has its own
 // direct stage. Resolve those explicit seams without searching unrelated pages.
 const host=children(layout).some(node=>node.name==='battlePanel')?layout:
  children(layout).some(node=>node.name==='stage')?requireChild(layout,'stage'):null;
 if(!host)throw Error('V25 battle chrome requires battlePanel or stage');
 const root=children(host).some(node=>node.name==='battlePanel')?requireChild(host,'battlePanel'):host;
 const turn=requireChild(root,'endTurn'),icon=requireChild(root,'energyIcon');
 if(children(icon).some(node=>node.name==='v25Chrome'))throw Error('V25 battle chrome already applied');
 // Validate the complete seam before changing anything: malformed input is not half transformed.
 for(const name of ['face','light','core','valueShadow'])requireChild(icon,name);
 const orbRim=requireChild(root,'energyRing'),orbShell=requireChild(root,'energyDisc');
 const badges=['draw','discard'].map(name=>[requireChild(root,name+'BadgeRing'),requireChild(root,name+'Badge')]);
 const turnStates=states.map(state=>requireChild(turn,state));
 for(const state of turnStates)for(const name of ['plate','plateLeft','plateRight','label'])requireChild(state,name);
 const piles=['draw','discard'].map(name=>requireChild(root,name+'Icon'));
 for(const pile of piles)for(const name of ['image','face','captionPlate','back2','back1','front','glyph','hit'])requireChild(pile,name);
 for(const state of turnStates){
  // The old hex button also owns border/inner side wedges. Keeping those
  // visible makes the restored 143px button sprout gold wings from the wider
  // former shell. Preserve handles for the controller, hide their paint.
  for(const part of state.children)if(part.name!=='label')part.visible=false;
  const label=requireChild(state,'label');
  label.text.colour=state.name==='disabled'?'#8F9591':'#E2DFD0';
  // Keep original objects and paths, including Lua's invisible compatibility plates.
  state.children=[...state.children.filter(node=>node!==label),turnChrome(state.name,turn.size,theme),label];
 }
 energyChrome(icon,theme);
 orbRim.colour='#514247';orbShell.colour='#24262A';
 for(const pair of badges){pair[0].colour='#53261F';pair[1].colour='#B13927';}
 piles.forEach((pile,index)=>pileChrome(pile,index===0?'draw':'discard',theme));
 return layout;
}
