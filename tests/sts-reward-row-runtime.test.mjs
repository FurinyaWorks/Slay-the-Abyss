import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme} from '../scripts/official-assets-layout.mjs';
import {applyStsRewardRows} from '../scripts/sts-reward-row-layout.mjs';
import {buildUiTheme} from '../scripts/build-ui-theme.mjs';
import {luaString,toLua} from '../scripts/build-lua-data.mjs';
import {runLua} from '../scripts/test-lua.mjs';
import {applyV25RewardLayout} from '../scripts/v25-node-layout.mjs';
const all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];
test('real reward button writer retains measured state colours, resolves changing rewards and caches idle icons',t=>{
 const temp=resolve('.artifacts/test-tmp');mkdirSync(temp,{recursive:true});const dir=mkdtempSync(join(temp,'reward-row-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const theme=officialAssetsTheme(nativeTheme),tree=gameLayout();applyV25RewardLayout(tree,theme);applyStsRewardRows(tree,theme);
 const names=['goldReward','stolenGold','cardReward','claimPotion','relicReward1','relicReward2','emeraldKeyReward','continue','rewardList','potionReward'];
 const faces=names.map(name=>all(tree).find(n=>n.name===name));
 writeFileSync(join(dir,'theme.json'),JSON.stringify(theme));buildUiTheme(join(dir,'theme.json'),'data',join(dir,'abyss_theme.lua'));
 const script=`package.path=${luaString(dir.replaceAll('\\','/')+'/?.lua;src/lua/?.lua;')}..package.path
local imageWrites=0
local function control(spec)
 local c={name=spec.name,children={},order={},text=spec.text and spec.text.content or''}
 function c:GetChild(name)return assert(self.children[name],self.name..'/'..name)end
 function c:GetChildren()return self.order end
 function c:SetImage(source,id)assert(source=='StaticReference');self.imageId=id;imageWrites=imageWrites+1 end
 function c:SetAnchoredPosition(x,y)self.position={x,y}end
 function c:SetSizeDelta(w,h)self.size={w,h}end
 function c:SetLocalScale(x,y,z)self.scale={x,y,z}end
 function c:SetVisible(v)self.visible=v end
 for _,s in ipairs(spec.children or{})do local n=control(s);c.children[n.name]=n;c.order[#c.order+1]=n end
 return c
end
local boxes={};for _,s in ipairs(${toLua(faces)})do boxes[s.name]=control(s)end
local Theme=require('abyss_theme')
local run={phase='reward',rewards={gold=12,goldClaimed=false,potion={id='fire_potion',resolved=false},relics={{sourceId='tiny_chest',claimed=false}}}}
local owner={run=run}
local api={imageSource='StaticReference'}
local writer=require('abyss_battle_details').install(owner,{}, {platform=api}, {
 child=function(name)return boxes[name]end,
 tint=function(c,tone)c.imageColor=tone end,ink=function(c,tone)c.fontColor=tone end,
})
local function same(a,b)return a and b and a.r==b.r and a.g==b.g and a.b==b.b end
local token=Theme.officialAssets.rewardRows
for _,name in ipairs({'goldReward','cardReward','claimPotion','relicReward1','continue'})do writer.button(name,true,false,'完整奖励文字')end
for _,name in ipairs({'goldReward','cardReward','claimPotion','relicReward1'})do
 for _,state in ipairs({'normal','hover','pressed','disabled'})do
  local part=boxes[name]:GetChild(state)
  assert(same(part:GetChild('stsRewardFace'):GetChild('vertical').imageColor,token[state]),name..' state fill was overwritten by generic button writer')
  assert(part:GetChild('label').text=='完整奖励文字')
 end
end
assert(boxes.goldReward:GetChild('normal'):GetChild('rewardIcon').imageId==Theme.icon.gold.id)
assert(boxes.cardReward:GetChild('normal'):GetChild('rewardIcon').imageId==Theme.icon.deck.id)
assert(boxes.claimPotion:GetChild('normal'):GetChild('rewardIcon').imageId==Theme.icon.potion.fire_potion)
assert(boxes.relicReward1:GetChild('normal'):GetChild('rewardIcon').imageId==105078)
local previous=imageWrites
writer.button('claimPotion',true,false,'药水');writer.button('relicReward1',true,false,'小箱子')
assert(imageWrites==previous,'idle redraw must not bind identical icon IDs again')
run.rewards.potion.id='block_potion';run.rewards.relics[1].sourceId='anchor'
writer.button('claimPotion',true,false,'格挡药水');writer.button('relicReward1',true,false,'石锚')
assert(boxes.claimPotion:GetChild('normal'):GetChild('rewardIcon').imageId==Theme.icon.potion.block_potion)
assert(boxes.relicReward1:GetChild('normal'):GetChild('rewardIcon').imageId==105065)
assert(same(boxes.continue:GetChild('normal'):GetChild('label').fontColor,token.ink),'Proceed flag cannot inherit generic primary dark ink')
assert(run.rewards.gold==12 and not run.rewards.goldClaimed and not run.rewards.potion.resolved and not run.rewards.relics[1].claimed)
local layout=require('abyss_battle_reward_layout')
local frame={listing=true,run=run,pendingPotion=true,manual=true}
run.rewards.relics[2]={sourceId='tiny_chest',claimed=false};run.rewards.emeraldKey={claimed=false}
layout.render(frame,function(name)return boxes[name]end,{})
assert(frame.rewardRows==6,'independent relics, key, potion and card entries stay separate')
local panel=boxes.rewardList:GetChild('stsRewardPanel')
assert(panel.position[2]+Theme.layout.battleRewards.expanded.stage[2]==token.panelPosition[2],'expanded host cannot move the reference panel')
assert(panel.scale[2]>1,'six independent rows expand the existing native panel instead of overflowing it')
run.rewards.relics={};run.rewards.emeraldKey=nil;frame.pendingPotion=false
layout.render(frame,function(name)return boxes[name]end,{})
assert(frame.rewardRows==2 and panel.scale[2]==1,'returning to the ordinary list restores measured panel size')
Theme.presentationProfile='functional'
writer.button('goldReward',true,false,'旧配置')
assert(same(boxes.goldReward:GetChild('normal'):GetChild('plate').imageColor,Theme.color.panelRaised),'legacy writer remains intact')
print('STS_REWARD_ROW_RUNTIME_PASS')
`;
 const file=join(dir,'runtime.lua');writeFileSync(file,script);const result=runLua(file,{timeout:15000});assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stdout,/STS_REWARD_ROW_RUNTIME_PASS/);
});
