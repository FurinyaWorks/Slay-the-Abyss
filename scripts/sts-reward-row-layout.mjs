import {nativeRoundedMaterial} from './official-battle-card-chrome.mjs';
import {flagButton} from './v25-character-layout.mjs';
export const stsRewardRowNames=Object.freeze(['goldReward','stolenGold','relicReward1','relicReward2','emeraldKeyReward','claimPotion','cardReward']);
const children=n=>n?.children??n?.controls??[];
const find=(n,name)=>n?.name===name?n:children(n).map(c=>find(c,name)).find(Boolean);
const required=(n,name)=>{const part=find(n,name);if(!part)throw Error('Missing reward control '+name);return part;};
const id=value=>typeof value==='object'?value.id:value;
function iconFor(name,theme){
 if(name==='goldReward'||name==='stolenGold')return id(theme.icon.gold);
 if(name==='cardReward')return id(theme.icon.deck);
 if(name==='claimPotion')return theme.icon.potion.empty;
 if(name==='emeraldKeyReward')return id(theme.icon.lock);
 return id(theme.icon.node.treasure);
}
function rowFace(row,theme){
 const token=theme.officialAssets.rewardRows;row.size=[...token.rowSize];
 for(const state of children(row)){
  const border=required(state,'border'),plate=required(state,'plate'),label=required(state,'label');
  for(const old of [border,plate]){old.visible=false;old.image=theme.image.rect;old.size=[...token.rowSize];}
  state.size=[...token.rowSize];state.scale=[1,1];
  const face=nativeRoundedMaterial('stsRewardFace',...token.rowSize,token.cornerRadius,token[state.name]??token.normal);
  const icon={name:'rewardIcon',kind:'image',position:[token.iconX,0],size:[token.iconSize,token.iconSize],image:iconFor(row.name,theme)};
  label.position=[token.textX,0];label.size=[token.textWidth,token.rowSize[1]-theme.space.s];
  Object.assign(label.text,{fontSize:token.fontSize,minFontSize:theme.font.minimum,autoSize:true,align:'left',valign:'middle',colour:state.name==='disabled'?theme.color.textMuted:token.ink,outline:false});
  state.children=[border,plate,face,icon,label];
 }
}
function proceedFlag(button,theme){
 const position=[...button.position],caption=required(button,'label').text.content;
 // Existing flagButton accepts a control wrapper. Adapt the native preset
 // without changing its state objects, listeners or controller ownership.
 const hit={name:'hit',kind:'container',children:button.children};
 const proxy={...button,children:[hit]};flagButton(proxy,'confirm',theme);
 button.size=[...proxy.size];button.position=position;button.children=hit.children;
 for(const state of button.children){
  for(const node of children(state))if(!['v25Flag','label'].includes(node.name)){node.visible=false;if(node.kind==='image')node.image=theme.image.rect;}
  required(state,'label').text.content=caption;
 }
}
export function applyStsRewardRows(tree,theme){
 const token=theme.officialAssets.rewardRows;if(!token)throw Error('Missing measured reward row tokens');
 const battle=find(tree,'battlePanel')??tree;
 if(find(battle,'stsRewardFace'))throw Error('Reward rows already composed');
 for(const name of stsRewardRowNames)rowFace(required(battle,name),theme);
 const layout=theme.layout.battleRewards;layout.rowSize=[...token.rowSize];layout.rowStep=token.rowStep;layout.expanded.rowStep=token.rowStep;
 layout.rowOrigin=[...token.rowOrigin];layout.title[1]=token.titleY;layout.subtitle[1]=token.subtitleY;
 const list=required(battle,'rewardList'),panel=nativeRoundedMaterial('stsRewardPanel',...token.panelSize,token.cornerRadius,token.panel);
 for(const name of ['title','subtitle'])required(list,name).position=layout[name].slice(0,2).map((v,axis)=>v-layout.stage[axis]);
 const paper=find(list,'v25RewardPaper');if(paper)paper.position=layout.title.slice(0,2).map((v,axis)=>v-layout.stage[axis]);
 const heading=find(required(battle,'rewardStage'),'title');
 const title=required(list,'title');title.text.fontSize=heading.text.fontSize;title.text.minFontSize=theme.font.minimum;
 Object.assign(required(list,'subtitle').text,{fontSize:token.fontSize,minFontSize:theme.font.minimum});
 panel.position=token.panelPosition.map((value,axis)=>value-layout.stage[axis]);
 required(list,'border').visible=false;required(list,'plate').visible=false;
 const background=children(list).findIndex(n=>n.name==='v25RewardField');list.children.splice(background+1,0,panel);
 proceedFlag(required(battle,'continue'),theme);
}
