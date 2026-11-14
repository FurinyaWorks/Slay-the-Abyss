import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {gameLayout} from '../scripts/game-ui-layout.mjs';
import {nativeTheme} from '../scripts/native-ui-theme.mjs';
import {officialAssetsTheme,applyOfficialAssets} from '../scripts/official-assets-layout.mjs';
import {buildUiTheme} from '../scripts/build-ui-theme.mjs';
import {luaString,toLua} from '../scripts/build-lua-data.mjs';
import {runLua} from '../scripts/test-lua.mjs';
import {deckCardTemplate} from '../scripts/deck-ui-layout.mjs';
const all=n=>[n,...(n.children??n.controls??[]).flatMap(all)];

for(const host of ['hand','browser'])test('real '+host+' CardSkin and Display reuse type/rarity handles without recursive repaints, preserve long text and source anchors',t=>{
 const base=resolve('.artifacts/test-tmp');mkdirSync(base,{recursive:true});
 const directory=mkdtempSync(join(base,'sts-card-runtime-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const theme=officialAssetsTheme(nativeTheme),tree=gameLayout(),deck=deckCardTemplate(theme);applyOfficialAssets([tree,deck],theme);
 const spec=host==='hand'?all(tree).find(n=>n.name==='card1'):deck.children.find(n=>n.name==='face');assert(spec);
 const changed=structuredClone(nativeTheme);changed.officialAssets.stsCardReference.typography.title=18;
 const changedTree=gameLayout();applyOfficialAssets([changedTree],officialAssetsTheme(changed));
 const changedFace=all(changedTree).find(n=>n.name==='card1');
 assert.equal(changedFace.children.find(n=>n.name==='name').text.fontSize,18,'installer must resolve the title token');
 const file=join(directory,'theme.json');writeFileSync(file,JSON.stringify(theme));buildUiTheme(file,'data',join(directory,'abyss_theme.lua'));
 const lua=`package.path=${luaString(directory.replaceAll('\\','/')+'/?.lua;src/lua/?.lua;')}..package.path
local reads,geometryWrites=0,0
local function control(spec)
 local c={name=spec.name,visible=spec.visible~=false,children={},order={},text=spec.text and spec.text.content or'',fontSize=spec.text and spec.text.fontSize}
 function c:GetChild(name)return assert(self.children[name],self.name..'/'..name)end
 function c:GetChildren()reads=reads+1;return self.order end
 function c:SetVisible(value)self.visible=value end
 function c:SetLocalScale(x,y,z)self.scale={x,y,z};if self.name:match('^part%d+$')then geometryWrites=geometryWrites+1 end end
 function c:SetSizeDelta(w,h)self.size={w,h};if self.name:match('^part%d+$')then geometryWrites=geometryWrites+1 end end
 function c:SetAnchoredPosition(x,y)self.position={x,y};if self.name:match('^part%d+$')then geometryWrites=geometryWrites+1 end end
 function c:SetLocalRotation(x,y,z)self.rotation=z;if self.name:match('^part%d+$')then geometryWrites=geometryWrites+1 end end
 for _,s in ipairs(spec.children or{})do local n=control(s);c.children[n.name]=n;c.order[#c.order+1]=n end
 return c
end
local box,Skin,Display,Theme=control(${toLua(spec)}),require('abyss_card_skin'),require('abyss_card_display'),require('abyss_theme')
local api={color=function(r,g,b,a)return{r=r,g=g,b=b,a=a}end}
local function definition(kind,rarity,cost)return{type=kind,rarity=rarity,cost=cost or 1,id='defend'}end
Display.writeTitle(box:GetChild('name'),'短标题',false,nil,box:GetChild('type'),'攻击')
assert(box:GetChild('name').fontSize==Theme.officialAssets.stsCardReference.typography.title,'first title writer must share installer font')
Skin.apply(box,definition('attack','common'),api,{cost=1,baseCost=1})
local firstReads=reads;assert(firstReads>0)
local firstWrites=geometryWrites
Skin.apply(box,definition('attack','rare'),api,{cost=1,baseCost=1})
assert(geometryWrites==firstWrites,'idle/rarity update cannot rewrite triangle geometry')
local root,back=box:GetChild('stsReferenceChrome'),box:GetChild('stsReferenceBack')
local portraits=back:GetChild('portraits')
assert(portraits:GetChild('attack').visible and not portraits:GetChild('skill').visible)
Skin.apply(box,definition('skill','uncommon'),api,{cost=0,baseCost=1})
assert(reads==firstReads,'changing type/rarity must reuse the discovered handles')
assert(portraits:GetChild('skill').visible and not portraits:GetChild('attack').visible)
assert(box:GetChild('costHalo').visible and box:GetChild('costDirection').text=='↓')
assert(not box:GetChild('nativeRibbon').visible and not box:GetChild('nativeCardBody').visible)
local framePart=root:GetChild('frame'):GetChild('batch0'):GetChild('part1')
local bannerPart=root:GetChild('banner'):GetChild('front'):GetChild('strip0')
local function colourIs(actual,expected)return actual.r==expected.r and actual.g==expected.g and actual.b==expected.b and actual.a==255 end
local function leaves(node,out)
 local children=node.order;if #children==0 then out[#out+1]=node else for _,child in ipairs(children)do leaves(child,out)end end
end
local function currentWell(kind,expected)
 local parts={};leaves(portraits:GetChild(kind):GetChild('well'),parts)
 for _,p in ipairs(parts)do assert(colourIs(p.imageColor,expected),kind..' well must retain the approved type or neutral token')end
 return parts[1]
end
currentWell('skill',Theme.cardSkin.artWells.skill)
assert(colourIs(framePart.imageColor,Theme.officialAssets.stsCardReference.rarity.uncommon.frame))
assert(colourIs(bannerPart.imageColor,Theme.officialAssets.stsCardReference.rarity.uncommon.banner))
Skin.apply(box,definition('power','rare'),api,{cost=1,baseCost=1})
assert(reads==firstReads and portraits:GetChild('power').visible)
currentWell('power',Theme.cardSkin.artWells.power)
assert(colourIs(framePart.imageColor,Theme.officialAssets.stsCardReference.rarity.rare.frame))
assert(colourIs(bannerPart.imageColor,Theme.officialAssets.stsCardReference.rarity.rare.banner))
Skin.apply(box,definition('attack','common'),api,{cost=1,baseCost=1})
local attackWell=currentWell('attack',Theme.cardSkin.artWells.attack)
local priorWellColour=attackWell.imageColor
box:GetChild('type').enableOutline=true
Skin.apply(box,definition('attack','common'),api,{cost=1,baseCost=1})
assert(attackWell.imageColor==priorWellColour,'idle apply cannot repaint cached illustration material')
assert(box:GetChild('type').enableOutline==false,'reference writer must clear an inherited type outline')
assert(colourIs(framePart.imageColor,Theme.officialAssets.stsCardReference.rarity.common.frame))
assert(colourIs(bannerPart.imageColor,Theme.officialAssets.stsCardReference.rarity.common.banner))
local part=root:GetChild('frame'):GetChild('batch2'):GetChild('part142')
assert(not part.visible and part.rotation==0 and part.position[1]==0 and part.scale[1]==1,'unused pool slots must reset after power reuse')
local outer=back:GetChild('body'):GetChild('bodyFit'):GetChild('vertical')
local geo=Theme.officialAssets.stsCardReference.character.outer
assert(outer.imageColor.r==geo.r and outer.imageColor.g==geo.g)
for _,kind in ipairs({'status','curse'})do
 Skin.apply(box,definition(kind,'common',-2),api,{})
 local neutral=Theme.officialAssets.battleCardBodyMaterials[kind].outerBevel
 assert(outer.imageColor.r==neutral.r and outer.imageColor.g==neutral.g,'neutral material must survive face reuse')
 Skin.apply(box,definition(kind,'rare',-2),api,{})
 local well=back:GetChild('portraits'):GetChild('skill'):GetChild('well'):GetChild('vertical')
 local neutralWell=Theme.officialAssets.battleCardBodyMaterials[kind].artWell
 assert(colourIs(well.imageColor,neutralWell),'rarity update must not reset neutral portrait colour')
end
Skin.apply(box,definition('attack','common'),api,{cost=1,baseCost=1})
assert(outer.imageColor.r==geo.r and outer.imageColor.g==geo.g,'returning to ordinary card must restore Geo')
currentWell('attack',Theme.cardSkin.artWells.attack)
local long=string.rep('对所有敌人造成伤害并施加易伤，然后抽牌。',8)
local label=box:GetChild('label');local fits=Display.writeBody(label,long,box)
assert(label.text==long and label.fontSize>=14 and not fits,'full text must remain intact when card space is exceeded')
local geometry=Theme.officialAssets.stsCardReference.geometry
assert(label.size[1]==geometry.body.size[1]and label.size[2]==geometry.body.size[2])
assert(label.position[2]==geometry.body.position[2])
Display.writeBody(label,'短文',box);Display.writeBody(label,long,box)
assert(label.text==long and label.position[2]==geometry.body.position[2]and reads==firstReads)
Display.writeTitle(box:GetChild('name'),'测试升级卡',true,2,box:GetChild('type'),'能力')
assert(box:GetChild('name').text:find('测试升级卡',1,true))
assert((box:GetChild('name').text..box:GetChild('type').text):find('＋2',1,true),'upgrade marker must stay accessible')
Display.writeTitle(box:GetChild('name'),'短标题',false,nil,box:GetChild('type'),'攻击')
assert(box:GetChild('name').fontSize==14,'recycled title cannot restore the legacy 16px font')
Theme.officialAssets.stsCardReference.typography.title=18
Display.writeTitle(box:GetChild('name'),'短标题',false,nil,box:GetChild('type'),'攻击')
assert(box:GetChild('name').fontSize==18,'resolved title token must drive the runtime writer')
Theme.officialAssets.stsCardReference.typography.title=14
Display.writeArt(box:GetChild('art'),definition('power','rare'),function(c,id)c.image=id end,box)
assert(box:GetChild('art').position[2]==geometry.portrait.position[2])
Skin.apply(box,definition('status','common',-2),api,{})
assert(not root:GetChild('costMaterial').visible and not box:GetChild('cost').visible)
assert(reads==firstReads)
print('STS_SHARED_CARD_RUNTIME_PASS')
`;
 const script=join(directory,'runtime.lua');writeFileSync(script,lua);
 const result=runLua(script,{timeout:15000});assert.equal(result.status,0,result.stderr+'\n'+result.stdout);assert.match(result.stdout,/STS_SHARED_CARD_RUNTIME_PASS/);
});
