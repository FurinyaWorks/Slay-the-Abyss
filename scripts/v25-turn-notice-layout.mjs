// Independently composed native controls from frozen V25 battle.js turnBanner /
// turnReveal. Native atlas fades, sword contours and text tracking need device
// comparison; no source SVG, private bitmap or browser implementation is bundled.
const nodes=n=>n?.children??n?.controls??[];
const child=(n,name)=>{const found=nodes(n).filter(c=>c.name===name);if(found.length!==1)throw Error('V25 turn notice requires one '+name);return found[0];};
const tint=colour=>({colour:colour.slice(0,7),...(colour.length===9?{opacity:parseInt(colour.slice(7),16)/255}:{})});
const image=(name,size,id,colour,position=[0,0],extra={})=>({name,kind:'image',position,size,image:id,...tint(colour),...extra});
const group=(name,size,children,position=[0,0],extra={})=>({name,kind:'container',position,size,children,...extra});
function swords(theme){
 const ink=theme.layout.v25TurnNotice.swordInk;
 return group('swords',[52,55],[-1,1].map(side=>group('sword'+side,[14,55],[
  image('edge',[8,39],theme.image.rect,ink.edge,[0,7]),
  image('blade',[5,36],theme.image.rect,side<0?ink.left:ink.right,[0,8]),
  image('tip',[8,7],100003,side<0?ink.left:ink.right,[0,27]),
  image('guard',[19,4],theme.image.rect,ink.guard,[0,-14]),
  image('handle',[4,12],theme.image.rect,ink.handle,[0,-22]),
 ],[0,0],{rotation:side*43})),[-96.5,0]);
}
export function applyV25TurnNoticeLayout(layout,theme){
 const host=nodes(layout).find(c=>c.name==='stage')??layout;
 const battle=nodes(host).find(c=>c.name==='battlePanel')??host;
 const feedback=child(battle,'feedback'),l=theme.layout.v25TurnNotice;
 if(nodes(feedback).some(c=>c.name==='v25TurnNotice'))throw Error('V25 turn notice already applied');
 if(!l||l.size?.[0]!==1280||l.size?.[1]!==100||l.duration!==1.7)throw Error('Missing frozen V25 turn notice tokens');
 const text=(name,font,ink)=>({name,kind:'text',position:[0,0],size:[600,font*2.4],text:{content:'',fontSize:font,minFontSize:font,align:'centre',valign:'middle',autoSize:true,...tint(ink)}});
 feedback.children.push(group('v25TurnNotice',[...l.size],[
  image('shade',[1280,66],theme.image.rect,l.shadeInk),
  image('fadeTop',[1280,17],106095,l.shadeInk,[0,41.5],{rotation:180}),
  image('fadeBottom',[1280,17],106095,l.shadeInk,[0,-41.5]),
  swords(theme),text('titleShadow',l.titleSize,l.shadowInk),text('title',l.titleSize,l.titleInk),
  text('subtitleShadow',l.subtitleSize,l.shadowInk),text('subtitle',l.subtitleSize,l.subtitleInk),
 ],[...l.position],{visible:false}));
 return layout;
}
