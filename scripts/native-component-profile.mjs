import {toLua} from './build-lua-data.mjs';
import {readFileSync} from 'node:fs';
import {nativeFontSize} from './native-ui-theme.mjs';
const theme=JSON.parse(readFileSync(new URL('../data/presentation/ui_theme.json',import.meta.url),'utf8'));
// Semantic layout and input stay with the game. Every old drawing becomes a
// non-painting anchor; visible component trees are instantiated from the kit.
// This comparison profile never calls the SVG/RGBA artwork pipeline.
const paint = ['image', 'imageType', 'colour', 'opacity', 'mask', 'fill', 'feather', 'invertMask'];
const semantic = node => ({name:node.name, kind:node.kind,
  ...(node.itemTemplate ? {itemTemplate:node.itemTemplate} : {}), children:[]});
const namesOf = node => new Set((node.children ?? []).map(c => c.name));
const positivePair = value => Array.isArray(value) && value.length === 2 && value.every(v => Number.isFinite(v) && v > 0);
function contentImagePath(node,path,rootName) {
  if(/^mapPanel\/mapGroup\d+\/(edge\d+|node\d+\/(icon|ring|positionToken))$/.test(path))return true;
  if(/^mapPanel\/mapGroup\d+\/typeLegend\/.+Icon$/.test(path))return true;
  if(/^(hpIcon|goldIcon|floorIcon|deckIcon|intentIcon|intentBadge|intentExtra|blockIcon|hpFill|hpGhost|hpTrack|shield|impact)$/.test(node.name))return true;
  if(/^(icon\d*|relicIcon|potionIcon)$/.test(node.name)&&!/(?:^|\/)(emblem|roleMark|skin)(?:\/|$)/.test(path))return true;
  if(/^battlePanel\/statusInfo\/(plate|border|shadow|accent|rule)$/.test(path))return true;
  if(rootName==='AbyssMonsterPower'&&node.name==='icon')return true;
  if(rootName==='AbyssMonsterActor'&&node.name==='portrait')return true;
  return false;
}
function contentColour(node) {
  return ((Math.round((node.opacity??1)*255)<<24)|(parseInt((node.colour??'#FFFFFF').slice(1),16)&0xffffff))>>>0;
}

export const componentBindingSource=binding=>'-- Generated local original-component bindings.\nreturn '+toLua(binding)+'\n';

export function assertComponentControlOutput(layout,templates,binding,widgets) {
  function noLegacy(node) {
    if(node.kind==='image'||paint.some(key=>Object.hasOwn(node,key)))throw Error('Legacy painter escaped the original-component profile: '+node.name);
    for(const child of node.children??node.controls??[])noLegacy(child);
  }
  noLegacy(layout);templates.forEach(noLegacy);
  if(layout.script?.name!=='abyss_ui'||layout.script?.values?.nativeComponentControls!==true)throw Error('Original-component mode is not mounted');
  if(binding?.schemaVersion!==1 || !binding.root || !binding.templates || !Array.isArray(binding.placements))throw Error('Missing original-component semantic binding');
  for(const key of ['cards','cardSurface','portraits','monsters','backgrounds'])if(binding.legacyArtwork?.[key]!==false)throw Error('Legacy artwork must be disabled: '+key);
  function compare(actual,spec) {
    if(!actual||actual.name!==spec.name||actual.kind!==(spec.kind==='image'?'container':spec.kind))throw Error('Original-component semantic binding differs: '+spec.name);
    const children=(actual.children??[]).filter(c=>c.name!=='__kitOriginal');
    if(children.length!==(spec.children??[]).length)throw Error('Original-component semantic children differ: '+spec.name);
    children.forEach((c,i)=>compare(c,spec.children[i]));
  }
  function checkPlacements(root,placements,semanticRoot) {
    const seen=new Set(),hosts=new Set();
    function collectHosts(node,path) {
      for(const child of node.children??[]) {
        if(child.name==='__kitOriginal') {
          if(hosts.has(path)||(child.children??[]).length)throw Error('Invalid original-component host');
          hosts.add(path);
        } else collectHosts(child,path?path+'/'+child.name:child.name);
      }
    }
    collectHosts(root,'');
    function requiredContent(node,spec,path) {
      if(contentImagePath(node,path,root.name)) {
        if(spec?.kind!=='image'||!spec.contentImage||!placements.some(p=>p.path===path&&p.role==='contentImage'&&p.geometrySlot===true))throw Error('Required business content image slot missing: '+path);
      }
      for(const child of node.children??[])if(child.name!=='__kitOriginal')requiredContent(child,(spec?.children??[]).find(s=>s.name===child.name),path?path+'/'+child.name:child.name);
    }
    requiredContent(root,semanticRoot,'');
    for(const placement of placements) {
      const widget=widgets[placement.role];
      if(placement.host!=='__kitOriginal'||widget?.templateId!==placement.templateId||widget?.sourceSha256!==placement.sourceSha256||seen.has(placement.path))throw Error('Invalid original-component placement');
      seen.add(placement.path);let node=root,nodeSpec=semanticRoot;
      for(const part of placement.path.split('/').filter(Boolean)) {
        const found=(node.children??[]).filter(c=>c.name===part);
        if(found.length!==1)throw Error('Ambiguous original-component business path');node=found[0];
        nodeSpec=(nodeSpec?.children??[]).find(c=>c.name===part);
      }
      if((node.children??[]).filter(c=>c.name==='__kitOriginal').length!==1)throw Error('Missing original-component host');
      if(placement.geometrySlot===true) {
        if(placement.role!=='contentImage'||JSON.stringify(placement.position)!=='[0,0]'||JSON.stringify(placement.scale)!=='[1,1]')throw Error('Invalid content image placement');
        const slot=nodeSpec?.contentImage;
        if(nodeSpec?.kind!=='image'||!slot||slot.templateId!==placement.templateId||slot.sourceSha256!==widget.sourceSha256
          ||!Number.isSafeInteger(slot.imageId)||slot.imageId<=0||!Number.isSafeInteger(slot.imageColor)||slot.imageColor<0||slot.imageColor>0xffffffff||typeof slot.fill!=='boolean'
          ||Object.keys(slot).some(k=>!['templateId','imageId','imageColor','fill','sourceSha256'].includes(k)))throw Error('Content image semantic binding differs');
        continue;
      }
      const size=positivePair(node.size)?node.size:widget.designSize;
      const ratios=[size[0]/widget.designSize[0],size[1]/widget.designSize[1]];
      const scale=placement.role==='panel'?ratios:[Math.min(...ratios),Math.min(...ratios)],center=widget.center??[0,0];
      const position=[-center[0]*scale[0],-center[1]*scale[1]];
      if(JSON.stringify(placement.scale)!==JSON.stringify(scale)||JSON.stringify(placement.position)!==JSON.stringify(position)
        ||JSON.stringify(placement.clearTextPaths??[])!==JSON.stringify(widget.clearTextPaths??[]))throw Error('Original-component placement pose/content differs');
    }
    if(hosts.size!==seen.size||[...hosts].some(path=>!seen.has(path)))throw Error('Original-component placement coverage differs');
  }
  const stages=layout.controls.filter(n=>n.name==='stage');
  if(stages.length!==1)throw Error('Original-component stage differs');
  compare(stages[0],binding.root);checkPlacements(stages[0],binding.placements,binding.root);
  if(templates.length!==Object.keys(binding.templates).length)throw Error('Original-component template inventory differs');
  for(const template of templates) {
    const spec=binding.templates[template.name];if(!spec)throw Error('Missing original-component template binding');
    compare(template,spec);checkPlacements(template,spec.placements??[],spec);
  }
  // A host/placement pair must not disappear together from a legal card or
  // button. Re-derive required roles from the semantic business layout, rather
  // than accepting only the hosts that a custom preparation chose to retain.
  function withoutHosts(node,spec) {
    const result=structuredClone(node);
    if(spec?.kind==='image')result.kind='image';
    if(spec?.contentImage) {
      result.image=spec.contentImage.imageId;
      result.colour='#'+(spec.contentImage.imageColor&0xffffff).toString(16).padStart(6,'0');
      result.opacity=(spec.contentImage.imageColor>>>24)/255;
      if(spec.contentImage.fill)result.fill={shape:'horizontal',from:'left',amount:1};
    }
    if(result.children)result.children=result.children.filter(c=>c.name!=='__kitOriginal').map(c=>withoutHosts(c,(spec?.children??[]).find(s=>s.name===c.name)));
    if(result.controls)result.controls=result.controls.map(c=>withoutHosts(c,c.name==='stage'?binding.root:undefined));
    return result;
  }
  const required=prepareComponentControlLayout(withoutHosts(layout),templates.map(t=>withoutHosts(t,binding.templates[t.name])),widgets).binding;
  if(JSON.stringify(binding.placements)!==JSON.stringify(required.placements))throw Error('Required original-component placement inventory differs');
  for(const [name,spec] of Object.entries(required.templates))if(JSON.stringify(binding.templates[name].placements)!==JSON.stringify(spec.placements))throw Error('Required dynamic original-component placement inventory differs');
}

export function prepareComponentControlLayout(layout, templates, widgets) {
  for (const role of ['button', 'card', 'panel', 'actor', 'emblem','contentImage','menu','costBadge']) {
    const widget = widgets[role];
    if (!widget || !Number.isSafeInteger(widget.templateId) || widget.templateId <= 0 || !positivePair(widget.designSize)
      || widget.center!==undefined && (!Array.isArray(widget.center)||widget.center.length!==2||!widget.center.every(Number.isFinite))
      || !/^[a-f0-9]{64}$/.test(widget.sourceSha256 ?? '')) throw Error('Invalid original component binding: ' + role);
  }
  const output = structuredClone(layout), templateOutput = structuredClone(templates), placements = [], accounting = [];
  const stage=output.controls.find(node=>node.name==='stage');
  if(stage&&!stage.children.some(node=>node.name==='componentLoading')) {
    const size=theme.canvas.base;
    stage.children.push({name:'componentLoading',kind:'container',position:[0,0],size,visible:false,
      children:[{name:'message',kind:'text',position:[0,0],size:[size[0],120],
        text:{content:'正在准备界面…',fontSize:nativeFontSize(theme.font.body,theme.font.minimum),
          colour:theme.color.text,align:'centre',valign:'middle',autoSize:true}}]});
  }
  function compile(node, path, plan, ancestorRole, textStyle,rootName='stage') {
    if (node.name === '__kitOriginal') throw Error('Reserved original-component host in business layout');
    const spec = semantic(node), names = namesOf(node);
    const card = ['cost', 'name', 'type'].every(n => names.has(n)) && (names.has('label')||names.has('description'));
    const button = !card && !ancestorRole && (node.kind==='presetButton' || names.has('hit') && (names.has('label') || node.children.some(c => c.name === 'hit' && c.kind === 'presetButton')));
    const page = !ancestorRole && /^(menuPanel|mapPanel|battlePanel|nodePanel|characterPanel|exitPanel|runMenu|deckPanel|choicePanel|potionPanel|componentLoading)$/.test(node.name);
    const actor = !ancestorRole && (names.has('portrait') && names.has('hp') && rootName!=='AbyssMonsterActor' || /^characterPanel\/details\/portraits\/[^/]+$/.test(path)||path==='nodePanel/merchant/portrait');
    const emblem = !ancestorRole && (node.name === 'emblem' || node.name==='neowFigure');
    let role = card ? 'card' : button ? 'button' : actor ? 'actor' : emblem ? 'emblem' : page ? 'panel' : null;
    // Page art must not suppress the card/button/actor roles nested inside it.
    if (ancestorRole === 'card' || ancestorRole === 'button' || ancestorRole === 'actor' || ancestorRole === 'emblem') role = null;
    if(path==='exitEntry/open')role='menu';
    if(node.kind==='image'&&node.name==='costDisc')role='costBadge';
    const widget = role && widgets[role];
    const dataImage=node.kind==='image'&&contentImagePath(node,path,rootName);
    if (role) {
      const size = positivePair(node.size) ? node.size : widgets[role].designSize;
      const ratios = [size[0] / widget.designSize[0], size[1] / widget.designSize[1]];
      const scale = role==='panel'?ratios:[Math.min(...ratios),Math.min(...ratios)];
      const center=widget.center??[0,0];
      const placement = {path, templateId:widget.templateId, host:'__kitOriginal', position:[-center[0]*scale[0], -center[1]*scale[1]], scale,
        clearTextPaths:widget.clearTextPaths ?? [], sourceSha256:widget.sourceSha256, role};
      plan.push(placement); accounting.push({path, role, sourceSha256:widget.sourceSha256, templateId:widget.templateId});
      if (role === 'card' && widget.fontColor !== undefined) textStyle = {fontColor:widget.fontColor};
    }
    if (node.kind === 'image') {
      if(dataImage) {
        const content=widgets.contentImage;
        spec.contentImage={templateId:content.templateId,imageId:node.image,imageColor:contentColour(node),fill:!!node.fill,sourceSha256:content.sourceSha256};
        const placement={path,role:'contentImage',templateId:content.templateId,sourceSha256:content.sourceSha256,host:'__kitOriginal',position:[0,0],scale:[1,1],geometrySlot:true};
        plan.push(placement);accounting.push({...placement,businessContent:true});
      }
      node.kind = 'container'; for (const key of paint) delete node[key];
      accounting.push({path, removedLegacyPaint:true});
    }
    // The native/SDK text shaper needs transparent space beyond a glyph line.
    // Keep centre, width and typography; never enlarge an input/scroll region.
    if(node.kind==='text' && node.text && Array.isArray(node.size)
      && (!node.text.background || node.text.backgroundOpacity===0)) {
      const height=Math.max(node.size[1],node.text.fontSize*2);
      if(height!==node.size[1]){accounting.push({path,textLineBounds:{before:node.size[1],after:height}});node.size[1]=height;}
    }
    if (textStyle && ['text', 'textWindow'].includes(node.kind)) spec.textStyle = {...textStyle};
    const children = node.children ?? [];
    spec.children = children.map(child => compile(child, path ? path + '/' + child.name : child.name, plan,
      role === 'panel' ? undefined : role || ancestorRole, textStyle,rootName));
    if (role||dataImage) {
      node.children ??= [];
      node.children.unshift({name:'__kitOriginal', kind:'container', position:[0, 0], size:node.size ?? widgets[role??'contentImage'].designSize});
    }
    return spec;
  }
  const stages = output.controls.filter(c => c.name === 'stage');
  if (stages.length !== 1) throw Error('Original-component profile requires one business stage');
  const root = compile(stages[0], '', placements);
  // Canvas backdrop is outside the uniformly scaled business stage. It keeps
  // its stretch/viewport geometry but contributes no legacy paint.
  for (const node of output.controls) if (node !== stages[0]) compile(node, '@viewport/' + node.name, []);
  const specs = {};
  for (const template of templateOutput) {
    const local = [];
    specs[template.name] = {...compile(template, '', local,undefined,undefined,template.name), placements:local};
  }
  function assertNoPaint(node) {
    if (node.kind === 'image') throw Error('Legacy painter escaped the component profile');
    for (const child of node.children ?? node.controls ?? []) assertNoPaint(child);
  }
  assertNoPaint(output); templateOutput.forEach(assertNoPaint);
  return {layout:output, templates:templateOutput,
    binding:{schemaVersion:1, root, templates:specs, placements,
      legacyArtwork:{cards:false, cardSurface:false, portraits:false, monsters:false, backgrounds:false}},
    receipt:{profile:'provided-components-control-v1', originalPlacements:accounting.filter(x => x.role),
      textLineBounds:accounting.filter(x=>x.textLineBounds),
      removedLegacyPaint:accounting.filter(x => x.removedLegacyPaint).length,
      boundary:'Business text/cursor/layout retained. Kit component trees supply all graphics. Official import and device performance unverified.'}};
}
