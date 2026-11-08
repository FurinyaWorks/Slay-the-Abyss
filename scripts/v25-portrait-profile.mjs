// Layout from the verified private V25 source, not a substitute character design.
// Source PNG SHA256 is shared with the existing public project full-body asset.
// Native battle133 is a 133px/64-colour sampled drawing: scaling it does not
// restore the original 1024x1536 pixels. Visual/device acceptance remains open.
export const v25PortraitSourceSha256='4851e4aae6c43799ec31e2b2ebd06f9b00cf07161f26e71d72a6ec89191ad98e';

export function v25PortraitRuntimeProfile(theme){
 const position=theme?.layout?.player?.position;
 if(!Array.isArray(position)||position.length!==2||!position.every(Number.isFinite))
  throw Error('V25 portraits require a finite player anchor');
 return {schemaVersion:1,sourceSha256:v25PortraitSourceSha256,battleDisplay:210,selectionDisplay:1380,
  // V25 hero image: left226/top292, 180x210 contain. A square133 source has
  // the same vertical fit at a 210px square centered at canvas (316,397).
  battlePosition:[-324-position[0],-37-position[1]],selectionPosition:[273,-239]};
}

const children=node=>node?.controls??node?.children??[];
function child(node,name,required=false){
 const matches=children(node).filter(item=>item.name===name);
 if(matches.length>1||required&&matches.length!==1)throw Error(`V25 portraits require one ${name}`);
 return matches[0];
}

export function applyV25PortraitProfile(layout,theme){
 const profile=v25PortraitRuntimeProfile(theme),stage=child(layout,'stage')??layout;
 const hero=child(child(stage,'battlePanel'),'hero');
 const details=child(child(stage,'characterPanel'),'details');
 const figure=child(hero,'officialFigure'),selection=child(details,'officialSelectionFigure');
 // Disabled optional artwork has no host and remains disabled. Never create
 // a replacement sprite, touch target or second character-selection identity.
 const hide=[];
 if(figure)for(const name of ['border','plate'])hide.push(child(hero,name,true));
 if(selection)for(const name of ['portraitFrame','floorShadow'])hide.push(child(details,name,true));
 for(const [host,display,position] of [[figure,profile.battleDisplay,profile.battlePosition],
  [selection,profile.selectionDisplay,profile.selectionPosition]]){
  if(!host)continue;
  host.position=[...position];host.size=[133,133];host.scale=[display/133,display/133];
 }
 for(const node of hide)node.visible=false;
 return layout;
}
