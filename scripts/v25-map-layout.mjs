// Independent native presentation from the authorized V25 map. Route generation,
// graph pools, clipping, scrolling, RNG and command ownership remain untouched.
export const v25MapSource=Object.freeze({
 record:'app.js:42 map(host,v), sts-map-restore.css mapscroll/atlas/map-legend/ribbon',
 scriptSha256:'66fb1f1e7ca018c600b67ea4b05f9010c32198d34c5c5a7d989bcc75a1dad75e',
 stylesSha256:'d0aa50eb665e04ae63e8741362acfd6ab5db371e5203777f9f4342696880fdc7',
 differences:'Paper grain/turbulence, scrolling marginalia, exact torn silhouettes and Kreon font remain unverified; native layered geometry and observed glow/fade materials are approximations, not pixel parity or performance evidence.',
});
const children=node=>node.controls??node.children??[];
const must=(node,name)=>{const found=children(node).filter(c=>c.name===name);if(found.length!==1)throw Error('V25 map requires '+name);return found[0];};
const group=(name,size,items,position=[0,0])=>({name,kind:'container',position:[...position],size:[...size],children:items});
const image=(name,x,y,w,h,id,colour,extra={})=>({name,kind:'image',position:[x,y],size:[w,h],image:id,colour,...extra});
const plate=(name,x,y,w,h,colour,extra={})=>image(name,x,y,w,h,100001,colour,extra);

function rounded(name,w,h,r,colour){
 return group(name,[w,h],[plate('vertical',0,0,w-r*2,h,colour),plate('horizontal',0,0,w,h-r*2,colour),
  ...[-1,1].flatMap(x=>[-1,1].map(y=>image('corner'+x+'_'+y,x*(w/2-r),y*(h/2-r),r*2,r*2,100002,colour)))]);
}

function paper(theme){
 const items=[plate('darkField',0,0,1280,720,'#030504'),
  image('fieldHaze',38,20,1150,720,theme.image.glowWide,'#15201F',{opacity:.72}),
  plate('parchment',.5,-22,838,676,'#929286'),
  image('paperAge',-20,-15,840,900,theme.image.glowWide,'#8C8B7F',{opacity:.35}),
  image('paperEdgeShade',.5,-22,842,676,theme.image.vignette,'#66695E',{opacity:.08}),
 ];
 // A bounded irregular edge, not a generated noise texture or a raster mosaic.
 for(let i=0;i<7;i++){
  const widths=[3.4,2,4,2.4,3.8,2.6,3.2],h=676/7,y=316-(i+.5)*h;
  items.push(plate('paperEdgeLeft'+i,-419+widths[i]/2,y,widths[i],h+.05,'#929286'),
   plate('paperEdgeRight'+i,419-widths[6-i]/2,y,widths[6-i],h+.05,'#929286'));
 }
 items.push(plate('leftInnerLight',-418,-22,1,676,'#DEDDD3',{opacity:.28}),
  plate('rightInnerLight',420,-22,1,676,'#D7D8CB',{opacity:.15}),
  plate('headerFace',0,338,1280,44,'#44464F'),
  image('headerDepth',0,338,1280,44,106095,'#2C3038'),
  plate('headerRule',0,316,1280,1,'#111A20',{opacity:.8}));
 return group('v25MapPaper',[1280,720],items);
}

function legendPaper(theme){
 const top=rounded('topRoll',246,31,10,'#AEC8CE');top.position=[0,150];
 top.children.push(image('rollLight',0,0,230,29,106095,'#C1D4D5',{rotation:180,opacity:.5}),
  image('fold',119,-2,20,36,100003,'#A1BDC5',{rotation:-15}));
 const bottom=rounded('bottomRoll',245,22,8,'#8FAEB8');bottom.position=[-2,-153];
 bottom.children.push(image('rollLight',0,0,242,20,106095,'#BAD1D5',{rotation:180}),
  plate('crease',0,-4,232,2,'#6E909C',{opacity:.7}),plate('glint',0,4,232,1,'#CADCDB',{opacity:.65}));
 return group('v25LegendPaper',[266,333],[
  image('shadow',3,-6,268,345,theme.image.glowWide,'#000000',{opacity:.5}),
  plate('paper',2,-9,232,300,'#A1BBC4'),
  image('paperLight',2,-9,300,232,106095,'#AEC8CE',{rotation:90,opacity:.65}),
  image('edgeDepth',2,-9,300,232,106095,'#7C9BA6',{rotation:-90,opacity:.25}),
  plate('leftFold',-113,-8,2,281,'#C1D4D5',{opacity:.45}),
  plate('rightFold',117,-8,2,281,'#7C9BA6',{opacity:.3}),top,bottom,
 ]);
}

function styleLegend(legend,theme){
 legend.position=[486,22.5];legend.size=[266,333];
 // Transparent bounds only: SDK font26 needs 41.7px for one line; preserve the source centre/font.
 const title=must(legend,'title');title.position=[0,129];title.size=[230,52];
 Object.assign(title.text,{content:'图例',fontSize:26,minFontSize:26,colour:'#1D2C32'});
 const rows=[['event','未知'],['shop','商人'],['treasure','宝箱'],['camp','休息'],['combat','敌人'],['elite','精英']];
 rows.forEach(([kind,label],i)=>{
  const icon=must(legend,kind+'Icon'),text=must(legend,kind+'Label'),y=86.5-i*40;
  icon.position=[-81.5,y];icon.size=[31,32];icon.colour='#20323A';
  text.position=[19,y];text.size=[140,40];Object.assign(text.text,{content:label,fontSize:22,minFontSize:22,colour:'#20323A',align:'left'});
 });
 // The approved A legend has six entries; the boss remains in the graph and
 // its existing legend handles remain addressable, rather than being deleted.
 must(legend,'bossIcon').visible=false;must(legend,'bossLabel').visible=false;
 legend.children.unshift(legendPaper(theme));
}

function styleReturn(button){
 button.position=[-552,-235];button.size=[184,52];
 for(const node of children(button))if(node.kind==='image')node.visible=false;
 const label=must(button,'label'),hit=must(button,'hit');
 label.position=[-5,0];label.size=[152,52];
 Object.assign(label.text,{fontSize:27,minFontSize:27,colour:'#F5DFA0',outlineColour:'#291B14',outlineOpacity:1});
 if(label.text.content==='返回菜单')label.text.content='返回';
 hit.size=[184,52];
 const chrome=group('v25ReturnFlag',[184,52],[
  plate('body',-12,-1,160,47,'#80363A'),
  image('faceLight',-12,-1,160,47,106095,'#953D42',{rotation:180}),
  image('upperTail',72,12,27,35,100003,'#953D42',{rotation:-90}),
  image('lowerTail',71,-12,33,34,100003,'#80363A',{rotation:-105}),
  plate('topStitch',-12,21,160,2,'#9A8B3E'),plate('bottomStitch',-12,-23,160,2,'#B39C47'),
 ]);
 button.children.splice(button.children.indexOf(label),0,chrome);
}

function styleResources(resources){
 for(const[name,x,w,colour,font]of [['hpIcon',-466,14,'#EF7375'],['hp',-422,70,'#EF7375',18],['goldIcon',-367,9,'#EFC96B'],['gold',-340,40,'#F1CE78',18]]){
  const control=must(resources,name);control.position=[x,338];control.size=[w,font?40:14];
  if(font)Object.assign(control.text,{fontSize:font,minFontSize:font,colour});else control.colour=colour;
 }
}

function styleResourceHints(hints,resources){
 for(const name of ['hp','gold']){
  const icon=must(resources,name+'Icon'),value=must(resources,name),host=must(hints,name),hit=must(host,'hit');
  const left=Math.min(icon.position[0]-icon.size[0]/2,value.position[0]-value.size[0]/2);
  const right=Math.max(icon.position[0]+icon.size[0]/2,value.position[0]+value.size[0]/2);
  host.position=[(left+right)/2,338];host.size=[Math.max(48,right-left),44];
  hit.size=[...host.size];
 }
}

export function applyV25MapLayout(layout,theme){
 const stage=children(layout).find(c=>c.name==='stage'),panel=children(layout).find(c=>c.name==='mapPanel')??children(stage??{}).find(c=>c.name==='mapPanel');
 if(!panel)throw Error('V25 map requires mapPanel');
 if(children(panel).some(c=>c.name==='v25MapPaper'))throw Error('V25 map layout already applied');
 const groups=children(panel).filter(c=>/^mapGroup\d+$/.test(c.name));
 const at=name=>{const found=groups.flatMap(children).filter(c=>c.name===name);if(found.length!==1)throw Error('V25 map requires '+name);return found[0];};
 const legend=at('typeLegend'),title=at('title');
 for(const name of ['title',...['event','shop','treasure','camp','combat','elite','boss'].flatMap(kind=>[kind+'Icon',kind+'Label'])])must(legend,name);
 const back=children(panel).find(c=>c.name==='previewBack'),resources=children(panel).find(c=>c.name==='resources'),hints=children(panel).find(c=>c.name==='resourceHints');
 if(back){must(back,'label');must(back,'hit');}
 if(resources)for(const name of ['hpIcon','hp','goldIcon','gold'])must(resources,name);
 if(hints&&resources)for(const name of ['hp','gold'])must(must(hints,name),'hit');
 const legacy=['mapField','mapLight','fog1','fog2','fog3','fog4','headerShade','headerDivider','titleLineLeft','titleLineRight'].map(at);
 // All validation completed before mutation. Preserve the mapGroup paths that
 // the real MapUI at() resolver owns, including the complete node/edge pools.
 for(const control of legacy)control.visible=false;
 title.position=[116,338];title.size=[220,40];Object.assign(title.text,{fontSize:14,minFontSize:14,colour:'#E4DDD0'});
 styleLegend(legend,theme);if(back)styleReturn(back);if(resources)styleResources(resources);
 if(hints&&resources)styleResourceHints(hints,resources);
 panel.children.unshift(paper(theme));return layout;
}
