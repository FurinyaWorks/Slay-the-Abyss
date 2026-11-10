import { nativeControls } from './native-ui-theme.mjs';
import { cardLightning } from './card-lightning.mjs';

// Native-library composition, not CSS clipping. The triangle is rotated by the importer.
function roundedParts(w,h,r,colour,picture,plate,frame,ry=r) {
  return [plate('vertical',frame([0,0],[w-2*r,h]),colour),
    plate('horizontal',frame([0,0],[w,h-2*ry]),colour),
    ...[-1,1].flatMap(x=>[-1,1].map(y=>picture('corner'+x+'_'+y,[x*(w/2-r),y*(h/2-ry),r*2,ry*2],100002,colour)))];
}
function windowParts(kind,w,h,colour,picture,plate,frame,reference) {
  if(kind==='skill')return roundedParts(w,h,reference?.cornerFraction?w*reference.cornerFraction:11,colour,picture,plate,frame,reference?.cornerFraction?h*reference.cornerFraction:11);
  if(kind==='power'&&reference?.ellipse)return [picture('arch',[0,0,w,h],100002,colour),
    {...plate('base',frame([0,0],[1,1]),colour),visible:false}];
  if(kind==='power')return [picture('arch',[0,h*.16,w,h*.68],100002,colour),
    plate('base',frame([0,-h*.17],[w,h*.66]),colour)];
  if(reference?.shoulder){const shoulder=reference.shoulder;return [
    plate('upper',frame([0,h*(1-shoulder)/2],[w,h*shoulder]),colour),
    {...picture('point',[0,-h*shoulder/2,w,h*(1-shoulder)],100003,colour),rotation:180}];}
  return [plate('upper',frame([0,h*.08],[w,h*.84]),colour),
    {...picture('point',[0,-h*.42,w,h*.16],100003,colour),rotation:180}];
}

function emblem(role,picture,colour,body) {
  const p=(name,xywh,id=100002,tone=colour)=>picture(name,xywh,id,tone);
  if(role==='HT')return Array.from({length:5},(_,i)=>p('petal'+i,[Math.sin(i*Math.PI*2/5)*3,Math.cos(i*Math.PI*2/5)*3,5,5]));
  if(role==='AR')return [p('moon',[0,0,11,11]),p('cut',[2,2,9,9],100002,body)];
  if(role==='FR')return [p('water',[0,-2,8,8]),p('tip',[0,2,8,8],100003)];
  if(role==='RD')return cardLightning(picture,colour);
  if(role==='curse')return [{...p('slash',[0,0,3,12],100001),rotation:45},{...p('backslash',[0,0,3,12],100001),rotation:-45}];
  return [p('symbol',[0,0,11,11],role==='traveler'?100004:role==='colorless'?100006:100004)];
}

// The same card face is assembled for hand/reward, library and node views.
// Context changes host controls, never the underlying artwork/text ownership.
export function cardFaceChildren(theme, context, interactive = true) {
  if (!['battle', 'deck', 'node'].includes(context)) throw new Error('Unknown card face context');
  const { text, plate, frame, hit } = nativeControls(theme);
  const { color: c, font: f, layout: l, space: s, image, icon } = theme;
  const card = l.card, [w, h] = card.size, b = s.border, top = h / 2, d = card.costDisc;
  const reference=card.v25Content,defaultWindow=reference?.windows.attack;
  const node = context === 'node';
  const nameY = top - card.nameBand / 2 - b;
  const artY = defaultWindow?.position[1]??top - card.nameBand - card.art / 2 - b;
  const artWidth=defaultWindow?.size[0]??w-b*2,artHeight=defaultWindow?.size[1]??card.art;
  const iconY=reference?.icons.attack[1]??artY;
  const iconSize = Math.min(card.artIcon, card.art);
  const trim = card.trim, blocked = theme.cardSkin.blocked;
  // The cost straddles the top-left corner; the title banner and frame carry rarity.
  const disc = card.costPosition??[-w / 2 + d / 2 - trim.costOverhang, top - d / 2 + trim.costOverhang];
  const typeY = reference?.typePosition[1]??top - card.nameBand - card.art - card.typeLine / 2 - b;
  const bandBottom = top - b - card.nameBand;
  const picture = (name, values, id, colour = c.text) => ({...plate(name,values,colour),image:id});
  const flowingText=(...args)=>{const control=text(...args);if(reference)control.text.valign='top';return control;};
  const hidden = control => ({...control, visible:false});
  const orb = (name, values, colour, id = image.disc) => ({...plate(name, values, colour), image:id});
  const cost=text('cost',frame(disc,[d,l.nativeText.lineHeight]),'',f.cost,c.energy);
  if(theme.cardSkin.costOutline)Object.assign(cost.text,{outline:true,
    outlineColour:theme.cardSkin.costOutline.colour,outlineOpacity:theme.cardSkin.costOutline.opacity});
  // STS AbstractCard.renderGlow: the hot card wears a wide soft halo; a 4px rim read as unselected.
  const padding = s.xl;
  // Views tint border/nameBand/nameRule by rarity, artPlate/costDisc by state;
  // the remaining trim is fixed-colour.
  return [
    ...(context === 'deck' ? [] : [hidden({...plate('glow', frame([0,0],[w+padding,h+padding]), c.goldBright), image:image.glow})]),
    hidden(plate('shadow', frame([0,-trim.shadow],[w,h]), c.cardShadow)),
    hidden(plate('border', frame([0,0],[w,h]), c.rarity.basic)),
    hidden(plate('plate', frame([0,0],[w-b*2,h-b*2]), c.cardBody)),
    ...[['roundShadow',0,-trim.shadow,w,h,7,c.cardShadow],['roundFrame',0,0,w,h,7,c.rarity.basic],['roundBody',0,0,w-b*2,h-b*2,4,c.cardBody]].map(([name,x,y,width,height,r,colour])=>({name,kind:'container',position:[x,y],size:[width,height],children:roundedParts(width,height,r,colour,picture,plate,frame)})),
    plate('nameBand', frame([0,nameY],[w-b*2,card.nameBand]), c.rarityBand.basic),
    plate('nameRule', frame([0,bandBottom],[w-b*2,b]), c.rarity.basic),
    // artPlate is the picture's 1px keyline; artWell is the dark window inside it.
    plate('artPlate', frame([0,artY],[artWidth,artHeight]), c.cardType.attack),
    plate('artWell', frame([0,artY],[artWidth-trim.keyline*2,artHeight-trim.keyline*2]), c.cardWell),
    {name:'skin',kind:'container',size:[w,h],children:[
      ...Array.from({length:theme.cardSkin.bandSteps},(_,i)=>plate('band'+(i+1),frame([0,nameY+card.nameBand/2-(i+.5)*card.nameBand/theme.cardSkin.bandSteps],[w-b*2,card.nameBand/theme.cardSkin.bandSteps+.1]),c.rarityBand.basic)),
      plate('gloss',frame([0,top-b-1],[w-b*2,1]),c.text),
      ...['attack','skill','power'].map(kind=>{const spec=reference?.windows[kind],width=spec?.size[0]??w-b*2,height=spec?.size[1]??card.art;return {name:kind,kind:'container',position:spec?[...spec.position]:[0,artY],size:[width,height],children:
        [0,1.5].map((inset,index)=>({name:index?'well':'edge',kind:'container',size:[width,height],children:
          windowParts(kind,width-inset*2,height-inset*2,index?c.cardWell:c.energy,picture,plate,frame,spec)
        }))};}),
    ]},
    ...(theme.presentationProfile==='v25-reference'?[{name:'v25Surface',kind:'container',position:[0,0],size:[w,h],visible:false,children:[]}]:[]),
    flowingText('name', frame(card.title.position,[card.title.width,Math.max(card.nameBand,l.nativeText.lineHeight)]), '', f.cardName,theme.cardSkin.text.title),
    ...(node ? Object.entries(icon.cardArt).map(([kind,id]) => hidden(picture(`art_${kind}`,[0,reference?.icons[kind]?.[1]??iconY,iconSize,iconSize],id)))
      : [picture('art',[0,iconY,iconSize,iconSize],icon.cardArt.attack)]),
    // Type pill on the picture's lower edge, wide enough for a moved "＋2" marker.
    hidden(plate('typeEdge', frame([0,typeY],[trim.typeTag[0]+trim.keyline*2,trim.typeTag[1]+trim.keyline*2]), c.gold)),
    hidden(plate('typeTag', frame([0,typeY],trim.typeTag), c.cardWell)),
    ...[['tagEdge',trim.typeTag[0]+trim.keyline*2,trim.typeTag[1]+trim.keyline*2,c.gold],['tagBody',...trim.typeTag,c.cardWell]].map(([name,width,height,colour])=>({name,kind:'container',position:[0,typeY],size:[width,height],children:roundedParts(width,height,height/2,colour,picture,plate,frame)})),
    text('type', frame([0,typeY],[w-s.s,l.nativeText.lineHeight]), '', f.minimum, c.gold),
    flowingText(node?'description':'label', frame(reference?.bodyPosition??[0,-top+card.textBox[1]/2+s.border],card.textBox), '', f.card,theme.cardSkin.text.body??c.text),
    orb('roleRing',frame([0,-h/2],[16,16]),c.cardWell),
    {name:'roleMark',kind:'container',position:[0,-h/2],size:[11,11],children:Object.keys(theme.cardSkin.roles).map(role=>({name:role,kind:'container',size:[11,11],children:emblem(role,picture,c.energy,c.cardWell)}))},
    // One native opacity layer: overlapping rounded parts would darken the centre twice.
    // Rounded alpha clipping remains an explicit platform verification gap.
    hidden(plate('blockedVeil',frame([0,0],[w-blocked.inset*2,h-blocked.inset*2]),blocked.veil)),
    hidden({name:'blockedPill',kind:'container',position:[0,blocked.pillY],size:[...blocked.pill],children:
      [0,blocked.stroke].map((inset,index)=>({name:index?'body':'edge',kind:'container',size:[...blocked.pill],children:
        roundedParts(blocked.pill[0]-inset*2,blocked.pill[1]-inset*2,blocked.pillRadius-inset,index?blocked.body:blocked.edge,picture,plate,frame)}))}),
    hidden(picture('blockedLock',[-blocked.pill[0]/2+blocked.padding+blocked.lock[0]/2,blocked.pillY,...blocked.lock],icon.lock,blocked.text)),
    hidden(text('blockedReason',frame([(blocked.lock[0]+blocked.gap)/2,blocked.pillY],[blocked.pill[0]-blocked.padding*2-blocked.lock[0]-blocked.gap,l.nativeText.lineHeight]),'',f.minimum,blocked.text)),
    hidden(orb('costHalo',frame(disc,[d+12,d+12]),c.positive,image.ring)),
    // Dark coin with a coloured ring and coloured numeral.
    orb('costCore', frame(disc,[d+trim.costRing,d+trim.costRing]), c.cardWell),
    orb('costDisc', frame(disc,[d,d]), c.energy, image.ring),
    cost,
    hidden(text('costDirection',frame([disc[0]+d/2-2,disc[1]-d/2+2],[20,l.nativeText.lineHeight]),'',f.minimum,c.positive)),
    ...(node ? [
      hidden(plate('veil',frame([0,0],[w,h]),c.backdropVeil)),
      hidden(plate('stampPlate',frame([0,0],[w-b*2,l.nativeText.lineHeight+s.s]),c.panelSunken)),
      hidden(text('stamp',frame([0,0],[w-s.s,l.nativeText.lineHeight]),'',f.label,c.goldBright)),
    ] : []),
    ...(interactive && context !== 'deck' ? [hit([w,h])] : []),
  ];
}
