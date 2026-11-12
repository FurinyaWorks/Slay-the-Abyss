// Frozen V25 battle.js deck-shell/deck-back + sts-battle-restore.css:105-108.
// Separate decoration only: the native scroller clones the live hand template.
export function battlePileChrome(theme){
 const image=(name,position,size,colour)=>({name,kind:'image',position,size,image:100001,colour});
 return {name:'pileChrome',kind:'container',size:[...theme.canvas.base],visible:false,children:[
  image('shade',[0,-22],[1280,676],'#000000'),
  {...image('vignette',[0,-123],[1160,700],'#101614'),image:106057,imageType:'basic',opacity:.9},
  {name:'empty',kind:'text',position:[0,30],size:[900,56],text:{content:'这里没有卡牌。',fontSize:26,minFontSize:26,align:'centre',valign:'middle',colour:'#B4AFA2'}},
  {name:'heading',kind:'text',position:[-143,282],size:[570,56],text:{content:'',fontSize:26,minFontSize:26,align:'left',valign:'middle',colour:'#E9DDB6'}},
 ]};
}
export function battlePileReturn(button,pile,texture){
 button.position=pile?[-550,-237]:button.position;
 for(const state of button.children[0].children){
  const colour=state.name==='hover'?'#A84D43':state.name==='pressed'?'#592A2B':'#8E3632';
  for(const part of state.children){
   if(part.name==='border'&&pile){part.image=100001;part.colour='#9B7A4E';}
   if(part.name==='plate'&&pile){part.image=texture??100001;part.colour=colour;part.size=button.size.map(v=>v-4);}
   if(part.name==='label'&&pile){part.text.colour='#E0BC73';part.text.content='返回';}
  }
 }
 if(pile&&texture){
  // Keep the permanent artwork outside preset-button state subtrees. The
  // installed Simulator has no normalChildId binding for native presets.
  const art=button.children[0].children.find(state=>state.name==='normal');
  art.name='art';
  button.children=[art,{name:'hit',kind:'cursorArea',size:[...button.size],focusable:true}];
 }
 return button;
}
