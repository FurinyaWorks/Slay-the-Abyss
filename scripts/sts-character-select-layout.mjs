// Geometry measured from the original PC CharacterSelectScreen (1920x1080).
// The reference bitmap is evidence only. Runtime uses existing native controls.
import {flagButton} from './v25-character-layout.mjs';
const parts=n=>n?.children??n?.controls??[];
const child=(n,k)=>parts(n).find(c=>c.name===k);
const rect=([x,y,w,h])=>({position:[x+w/2-640,360-y-h/2],size:[w,h]});
const image=(name,size,colour,theme,position=[0,0])=>({name,kind:'image',position,size,image:theme.image.rect,colour});
function placeText(node,frame,font,colour,minimum){Object.assign(node,rect(frame));Object.assign(node.text,{fontSize:font,minFontSize:minimum,colour,align:'left',valign:'middle'});}
export function stsCharacterPortraitProfile(theme){
 const t=theme.layout.stsCharacter,p=t.portrait,c=p.crop,[x,y]=t.roster.origin;
 if(p.source!=='battleApprovedIdle'||p.sourceSize[0]!==210||p.sourceSize[1]!==192)throw Error('STS selection requires the same approved battle idle source');
 if(![p.display,c.left,c.right,c.bottom,c.top].every(Number.isFinite)||p.display<=0||c.left>=c.right||c.bottom>=c.top
  ||c.left<-p.sourceSize[0]/2||c.right>p.sourceSize[0]/2||c.bottom<-p.sourceSize[1]/2||c.top>p.sourceSize[1]/2)
  throw Error('STS selection crop must stay inside the shared idle source');
 const scale=p.display/p.sourceSize[0];
 return {schemaVersion:1,source:p.source,display:p.display,crop:{...c},
  position:[x-640-(c.left+c.right)*scale/2,360-y-(c.bottom+c.top)*scale/2]};
}
function slotFace(state,size,theme,t){
 const label=child(state,'label'),bust=child(state,'bust');
 for(const part of parts(state))part.visible=false;
 state.size=[...size];state.scale=[1,1];
 const [w,h]=size,c=t.colour;
 state.children.push({name:'stsStone',kind:'container',size:[w,h],children:[
  image('stone',[w,h],c.slotDark,theme),image('face',[w-8,h-8],c.slot,theme),
  image('top',[w-12,5],c.slotLight,theme,[0,h/2-5]),
  image('left',[5,h-12],c.slotLight,theme,[-w/2+5,0]),
  image('bottom',[w-12,5],c.slotDark,theme,[0,-h/2+5]),
  image('right',[5,h-12],c.slotDark,theme,[w/2-5,0]),
 ]});
 if(bust){bust.position=[0,0];bust.size=[w-16,h-16];bust.visible=true;state.children.push(...state.children.splice(state.children.indexOf(bust),1));}
 if(label){label.visible=false;label.text.content='';}
}
function action(button,name,theme,t){
 flagButton(button,name,theme);
 Object.assign(button,rect(t.rectangles[name]));const hit=child(button,'hit');hit.size=[...button.size];
 for(const state of parts(hit)){
  const flag=child(state,'v25Flag'),edges=[];
  const visit=(node,y=0)=>{const cy=y+(node.position?.[1]??0);if(node.kind==='image')edges.push(cy-node.size[1]/2,cy+node.size[1]/2);for(const part of parts(node))visit(part,cy);};
  visit(flag);const low=Math.min(...edges),high=Math.max(...edges);
  flag.position=[0,-(low+high)/2];state.scale=[1,button.size[1]/(high-low)];
  const label=child(state,'label');label.text.content=name==='cancel'?'返回':'启程';
  label.position[1]=0;label.text.fontSize=t.font.button;label.text.minFontSize=theme.font.minimum;
  label.text.colour=state.name==='disabled'?t.colour.muted:t.colour.buttonInk;
  const backing=child(state,'officialButtonBacking');if(backing)backing.visible=false;
 }
}
export function applyStsCharacterLayout(layout,theme){
 const stage=child(layout,'stage')??layout,panel=child(stage,'characterPanel'),details=child(panel,'details'),t=theme.layout.stsCharacter;
 if(!t)throw Error('Missing original STS character reference tokens');
 const marker={name:'stsCharacter',kind:'container',size:[1280,720],children:[]};panel.children.push(marker);
 for(const name of ['title','v25HeadingEmblem','v25HeadingDivider','v25HeadingRule','v25Roster']){
  const old=child(panel,name);if(old)old.visible=false;
 }
 placeText(child(panel,'hint'),t.rectangles.hint,t.font.hint,t.colour.text,theme.font.minimum);
 for(const [name,font,colour]of [['name','name','name'],['stats','stats','hp'],['gold','stats','gold'],['relic','relic','name'],['relicText','relicText','text'],['deckTitle','deckTitle','text'],['deckSummary','deckSummary','text']])
  placeText(child(details,name),t.rectangles[name],t.font[font],t.colour[colour],theme.font.minimum);
 placeText(child(details,'v25Story'),t.rectangles.story,t.font.story,t.colour.text,theme.font.minimum);
 child(details,'relicTag').visible=false;child(details,'deckRule').visible=false;
 Object.assign(child(details,'v25HealthIcon'),rect(t.rectangles.hpIcon));
 const gold=child(details,'v25GoldIcon');Object.assign(gold,rect(t.rectangles.goldIcon));gold.scale=[t.rectangles.goldIcon[2]/36,t.rectangles.goldIcon[3]/40];
 const relic=child(details,'v25RelicIcon');Object.assign(relic,rect(t.rectangles.relicIcon));
 for(const part of parts(relic))part.size=[...relic.size];
 const deck=child(details,'deckOpen');Object.assign(deck,rect(t.rectangles.deckOpen));child(deck,'hit').size=[...deck.size];
 for(const state of parts(child(deck,'hit'))){
  state.size=[...deck.size];for(const part of parts(state))part.visible=part.name==='label';
  const label=child(state,'label');label.position=[0,0];label.size=[...deck.size];label.text.fontSize=t.font.deckOpen;label.text.minFontSize=theme.font.minimum;label.text.colour=t.colour.name;
 }
 const roles=['traveler','character1','character2','character3','character4'];
 for(const [i,name]of roles.entries()){
  const button=child(panel,name),[w,h]=t.roster.size,[x,y]=t.roster.origin;
  button.position=[x+i*t.roster.step-640,360-y];button.size=[w,h];
  const hit=child(button,'hit');hit.position=[0,0];hit.size=[w,h];
  for(const state of parts(hit))slotFace(state,[w,h],theme,t);
  // The traveler slot is painted by the same live idle controller as battle.
  if(name==='traveler')for(const state of parts(hit))child(state,'bust').visible=false;
  const selected=child(button,'selected');selected.position=[0,0];selected.size=[w+8,h+8];selected.colour=t.colour.selected;
  button.children.splice(button.children.indexOf(selected),1);button.children.unshift(selected);
 }
 const profile=stsCharacterPortraitProfile(theme),figure=child(details,'officialSelectionFigure');
 if(figure){figure.position=[...profile.position];figure.size=[...t.portrait.sourceSize];figure.scale=[1,1];}
 child(details,'portraits').visible=false;child(details,'portraitNote').visible=false;
 action(child(panel,'cancel'),'cancel',theme,t);action(child(panel,'confirm'),'confirm',theme,t);
 // Keep the reused half-body above its native slot and the deck modal above it.
 const modal=child(panel,'deckView');modal.visible=false;modal.children=[];
 panel.children=parts(panel).filter(n=>n!==details&&n!==modal);panel.children.push(details,modal);
 return layout;
}
