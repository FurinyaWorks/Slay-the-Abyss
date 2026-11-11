// Independent native layout from the frozen V25 reference. Original bitmaps,
// SVG source and browser code are not embedded. Flags use 2px native shape bands;
// fonts/gradients and the enlarged 133px portrait still require visual review.
export const v25CharacterReference=Object.freeze({
 sourceCommit:'7e40d2d361fff6b9c89d9f409db29a9d8ac44352',
 cssSha256:'9a6d137a3297559f638e5323db424506ae394c7942cdf334551936ac0d74d17d',
 background:{file:'menu-reference-background.png',sha256:'fdc94718cbc2ab52a8107bc8bd35971cec51ba18c5271e9e927c822d9a7dca39'},
 constellation:{file:'constellation-exact.png',sha256:'5780bc541d322b369b61f656908da59bdeee7f3ad83988edca8be23776720ecd'},
 unverified:['background-binding','constellation-binding','full-resolution-portrait','native-font-and-gradient-parity','native-flag-curve-parity','native-text-height-device-parity'],
});
const children=node=>node?.controls??node?.children??[];
function child(node,name){
 const matches=children(node).filter(item=>item.name===name);
 if(matches.length!==1)throw Error(`V25 character layout requires one ${name}`);
 return matches[0];
}
const optional=(node,name)=>children(node).find(item=>item.name===name);
const frame=(x,y,w,h)=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});
const group=(name,size,items=[],position=[0,0])=>({name,kind:'container',position:[...position],size:[...size],children:items});
const image=(name,position,size,id,colour,extra={})=>({name,kind:'image',position:[...position],size:[...size],image:id,colour,...extra});
function text(name,rectangle,content,font,colour){
 return {name,kind:'text',...frame(...rectangle),text:{content,fontSize:font,minFontSize:font,autoSize:true,align:'left',valign:'middle',colour}};
}
function upsert(parent,node,index=children(parent).length){
 const existing=optional(parent,node.name);
 if(existing){Object.assign(existing,node);return existing;}
 children(parent).splice(index,0,node);return node;
}
function placeText(control,rectangle,font,colour){
 Object.assign(control,frame(...rectangle));
 control.text={...control.text,fontSize:font,minFontSize:font,align:'left',valign:'middle',colour};
}
// Source CSS rectangles still determine each centre/width/font below. Actual
// BeyondSimulator0.5.2 glyph layout needs line-height plus a font inset: the
// tight CSS single-line boxes reported visibleLineCount=0. Only the eight
// reproduced fields get larger transparent native bounds (2*font); no font,
// text, input, writer, position or autoSize change. Official device parity is
// still unverified; this is not a change to the approved visual rectangles.
function nativeSingleLine(control){control.size[1]=Math.max(control.size[1],control.text.fontSize*2);return control;}
function rounded(name,w,h,radius,colour,theme){
 return group(name,[w,h],[image('vertical',[0,0],[w-2*radius,h],theme.image.rect,colour),
  image('horizontal',[0,0],[w,h-2*radius],theme.image.rect,colour),
  ...[-1,1].flatMap(x=>[-1,1].map(y=>image(`corner${x}_${y}`,[x*(w/2-radius),y*(h/2-radius)],[radius*2,radius*2],theme.image.disc,colour)))]);
}

// Scan the small fixed native banner silhouette into merged horizontal bands.
// No per-frame drawing, external assets, pixel card conversion or new input.
function bands(name,points,colour,theme){
 const rows=[];
 for(let y=0;y<60;y+=2){
  const scan=y+1,xs=[];
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))xs.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));
  }
  if(xs.length<2)continue;
  xs.sort((a,b)=>a-b);const left=Math.round(xs[0]),right=Math.round(xs.at(-1));
  const previous=rows.at(-1);
  if(previous&&previous.left===left&&previous.right===right&&previous.y+previous.h===y)previous.h+=2;
  else rows.push({left,right,y,h:2});
 }
 return group(name,[180,60],rows.map((row,i)=>image('band'+i,[(row.left+row.right)/2-90,30-row.y-row.h/2],
  [row.right-row.left,row.h],theme.image.rect,colour)));
}
const outlines={
 cancel:[[-3,9],[153,9],[166,7],[174,2],[178,12],[174,21],[163,28],[151,33],[161,37],[174,36],[177,44],[173,50],[160,57],[143,59],[-3,59]],
 confirm:[[183,10],[47,10],[33,11],[21,20],[13,20],[4,12],[1,26],[6,40],[26,53],[41,58],[56,59],[183,59]],
};
const palettes={
 cancel:{normal:['#BCA348','#8C3739','#B95B4A'],hover:['#DFC154','#A54243','#DA6B57'],pressed:['#AD9642','#813335','#AA5444'],disabled:['#807556','#5A4447','#80675D']},
 confirm:{normal:['#A2B4B5','#477B89','#77A4AF'],hover:['#BFD4D6','#5491A2','#8CC1CF'],pressed:['#95A6A7','#41717E','#6D97A1'],disabled:['#7E8B8C','#414F55','#64777D']},
};
function flagButton(button,name,theme,options){
 Object.assign(button,frame(name==='cancel'?0:1100,561,180,60));
 const hit=child(button,'hit');hit.position=[0,0];hit.size=[180,60];
 const points=outlines[name],inner=points.map(([x,y])=>[90+(x-90)*178/180,30+(y-30)*58/60]);
 for(const stateName of ['normal','hover','pressed','disabled']){
  const state=child(hit,stateName),label=child(state,'label');
  state.size=[180,60];state.scale=[1,1];
  child(state,'border').visible=false;child(state,'plate').visible=false;
  const [rim,fill,light]=palettes[name][stateName];
  const flag=options?.nativeFlagImage ? group('v25Flag',[180,60],[image('cloth',[0,0],[180,60],options.nativeFlagImage,fill,{imageType:'basic'})]) : group('v25Flag',[180,60],[bands('rim',points,rim,theme),bands('cloth',inner,fill,theme),
   image('upperThread',[name==='cancel'?-8:13,16],[145,1.5],theme.image.rect,light),
   image('lowerThread',[name==='cancel'?-16:15,-24],[128,1.5],theme.image.rect,light)]);
  upsert(state,flag,children(state).indexOf(label));
  label.position=[name==='cancel'?-10:10,-6];label.size=[150,42];
  label.text={...label.text,content:name==='cancel'?'返回':'开始挑战',fontSize:26,minFontSize:26,colour:stateName==='disabled'?'#B8B4A5':'#FFF0B1',align:'centre',valign:'middle'};
 }
}
function roster(theme){
 const selected=group('selected',[124,124],[
  image('glow',[0,0],[142,142],theme.image.glow,'#DBA44B',{opacity:.5}),
  rounded('rim',124,124,9,'#FFE0A2',theme),rounded('gold',118,118,6,'#B68B4D',theme),
  rounded('body',112,112,4,'#303341',theme),
  {...group('v25Constellation',[110,110]),visible:false},
  {...nativeSingleLine(text('spark',[0,0,24,26],'✦',21,'#FFF2CE')),position:[62,12]},
 ],frame(399,515,124,124).position);
 const locked=Array.from({length:3},(_,i)=>{
  const lock=group('lock',[30,35],[
   image('shackle',[0,8],[21,21],theme.image.ring,'#C7BAA8'),
   rounded('body',24,20,2,'#C7BAA8',theme),
   image('key',[0,-1],[3,8],theme.image.rect,'#363945'),
  ]);
  return group('locked'+(i+1),[101,101],[rounded('rim',101,101,10,'#817A81',theme),
   rounded('body',97,97,8,'#444550',theme),rounded('innerLine',91,91,7,'#6B646D',theme),
   rounded('innerPlate',89,89,6,'#444550',theme),lock],frame(543+i*121,526.5,101,101).position);
 });
 return group('v25Roster',[1280,720],[selected,...locked]);
}
function detailsLayout(details,theme){
 const spec={name:[[75,126,503,66.25],53,'#F7E4C7'],stats:[[108,218.25,145,34],19,'#ED6460'],
  gold:[[286,218.25,160,34],19,'#E4C65C'],relicTag:[[165,405.53125,350,22],18,'#E6CDB0'],
  relic:[[165,430.53125,350,39.140625],29,'#F4D9A7'],relicText:[[165,472.671875,420,27.1875],17,'#E8D1B2'],
  deckTitle:[[75,632,280,24],14,'#E6CDB0'],deckSummary:[[75,661,280,36],14,'#E8D1B2'],
  portraitNote:[[400,674,600,28],14,'#B7ADA0']};
 for(const [name,[rectangle,font,colour]]of Object.entries(spec)){
  const control=child(details,name);placeText(control,rectangle,font,colour);
  if(['name','relicTag','relic','relicText','deckTitle'].includes(name))nativeSingleLine(control);
 }
 Object.assign(child(details,'deckRule'),frame(75,381.53125,430,1));child(details,'deckRule').colour='#DEC29A';
 upsert(details,text('v25Story',[75,287.25,503,71.28125],typeof theme.v25Character?.story==='string'?theme.v25Character.story:'',23,'#EEDBBF'));
 const iconId=value=>typeof value==='object'?value.id:value;
 upsert(details,image('v25HealthIcon',frame(75,223.75,24,23).position,[24,23],iconId(theme.icon.hp),'#ED6460'));
 upsert(details,image('v25GoldIcon',frame(252.421875,221.25,25,28).position,[25,28],iconId(theme.icon.gold),'#D1D0BD'));
 const icon=group('v25RelicIcon',[67,76],[],frame(75,414.6875,67,76).position),id=theme.v25Character?.relicImageId;
 icon.visible=Number.isSafeInteger(id)&&id>0;
 if(icon.visible)icon.children.push(image('image',[0,0],[67,67*90/83],id,'#FFFFFF'));
 upsert(details,icon);
 const figure=optional(details,'officialSelectionFigure');
 if(figure){figure.position=[273,-239];figure.size=[133,133];figure.scale=[1380/133,1380/133];}
 child(details,'portraitFrame').visible=false;child(details,'floorShadow').visible=false;
 const deck=child(details,'deckOpen');Object.assign(deck,frame(1040,642,180,40));
 const hit=child(deck,'hit');hit.size=[180,40];
 for(const state of children(hit)){
  state.size=[180,40];child(state,'border').size=[180,40];child(state,'plate').size=[176,36];
  const label=child(state,'label');label.size=[170,32];label.text.fontSize=14;label.text.minFontSize=14;
 }
}
export function applyV25CharacterLayout(layout,theme,options={}){
 const stage=optional(layout,'stage')??layout,panel=child(stage,'characterPanel'),details=child(panel,'details');
 for(const name of ['veil','border','face','themes','scrim'])child(panel,name).visible=false;
 // No old scene host: the legacy portrait scene owner otherwise reactivates it.
 panel.children=children(panel).filter(node=>node.name!=='lowpolyScene');
 const background={...group('v25Background',[1280,720]),visible:false};upsert(panel,background,0);
 placeText(child(panel,'title'),[123.625,25.65625,150,29.6875],27,'#F3DEC0');nativeSingleLine(child(panel,'title'));child(panel,'title').text.content='选择角色';
 placeText(child(panel,'hint'),[75,76,503,28],14,'#E8D1B2');
 upsert(panel,nativeSingleLine(text('v25HeadingEmblem',[43,15,43,51],'✦',51,'#ECD6B6')));
 upsert(panel,image('v25HeadingDivider',frame(104,23.5,1,34).position,[1,34],theme.image.rect,'#E8D1B4',{opacity:.55}));
 upsert(panel,image('v25HeadingRule',frame(261.734375,39.5,146,2).position,[146,2],theme.image.rect,'#CCAA7A'));
 detailsLayout(details,theme);upsert(panel,roster(theme));
 flagButton(child(panel,'cancel'),'cancel',theme,options);flagButton(child(panel,'confirm'),'confirm',theme,options);
 // The existing live deck modal must stay above all new read-only decoration.
 const modal=child(panel,'deckView'),items=children(panel);items.splice(items.indexOf(modal),1);items.push(modal);
 return layout;
}
