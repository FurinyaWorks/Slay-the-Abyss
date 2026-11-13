// Project-owned approved guide(), reference-ui-lab/blessing.js. This is the
// hooded guide from the approved project SVG, not original StS Neow artwork.
import {curve,bands} from './v25-character-layout.mjs';
import {nativeShape} from './v25-battle-scene.mjs';

export const neowGuidePaths=Object.freeze({
 cloak:'M184 185Q170 47 308 24q139 27 124 177l55 123 61 234q-194 49-377-4l43-243Z',
 void:'M212 170q7-92 95-111 83 28 98 114l-93 103Z',
 fold:'m213 176 99 100 94-103-40 144 105 224-162-32-134 34 88-225Z',
 foldLines:'m220 190 91 87 90-91m-89 93-4 230m-93-152-42 178m221-176 58 177',
 sleeves:'m191 326-54 75 43 24 68-66m153-28 42 64-46 23-33-65',
 staff:'m144 411-12 148',gem:'m126 407 27 2 5-39-26-5Z',clasp:'m313 275 12 18-12 18-12-18Z',
});
export const neowGuideContours=Object.freeze({
 cloak:curve([184,185],[[170,47],[308,24]],[[447,51],[432,201]],[[487,324]],[[548,558]],[[354,607],[171,554]],[[214,311]]),
 void:curve([212,170],[[219,78],[307,59]],[[390,87],[405,173]],[[312,276]]),
 fold:[[213,176],[312,276],[406,173],[366,317],[471,541],[309,509],[175,543],[263,318]],
 foldLines:[[[220,190],[311,277],[401,186]],[[312,279],[308,509]],[[215,357],[173,535]],[[394,359],[452,536]]],
 sleeves:[[[191,326],[137,401],[180,425],[248,359]],[[401,331],[443,395],[397,418],[364,353]]],
 staff:[[144,411],[132,559]],gem:[[126,407],[153,409],[158,370],[132,365]],
 clasp:[[313,275],[325,293],[313,311],[301,293]],
});
const group=(name,children)=>({name,kind:'container',position:[0,0],size:[600,600],children});
function drawing(name,type,points,colour,width=0,opacity=1){
 // Reuse the native scene adapter, correcting its 1280x676 scene origin once
 // into this SVG's 600x600 viewBox. Scene tone grading must not recolour SVG.
 const nodes=nativeShape({name,type,points:points.map(([x,y])=>[x+340,y+38]),colour,width,opacity},
  {image:{rect:100001}},{edgeBleed:.1,earSelection:'balanced'}).map(node=>({...node,colour}));
 return group(name,nodes.length<=60?nodes:Array.from({length:Math.ceil(nodes.length/50)},(_,i)=>group('part'+i,nodes.slice(i*50,i*50+50))));
}
export function approvedNeowGuide(theme){
 const t=theme.officialAssets.neowGuide;
 if(!t)throw Error('Approved Neow guide requires shared neowGuide tokens');
 const p=neowGuideContours;
 const filled=(name,points,colour)=>drawing(name,'polygon',points,colour);
 const stroke=(name,points,colour,width,closed=false,opacity=1)=>drawing(name,'line',closed?[...points,points[0]]:points,colour,width,opacity);
 const cloak=bands('cloak',p.cloak,y=>{
  // Existing 2px SVG silhouette scanner, with source gradient stops. A native
  // vertical stepped gradient approximates the SVG's slight x2=.3 slant.
  const factor=Math.max(0,Math.min(1,(y-24)/(607-24)));
  return '#'+[1,3,5].map(i=>Math.round(parseInt(t.cloak.slice(i,i+2),16)*(1-factor)+parseInt(t.cloakBottom.slice(i,i+2),16)*factor).toString(16).padStart(2,'0')).join('');
 },theme,{width:600,height:600,step:2});
 cloak.children=Array.from({length:Math.ceil(cloak.children.length/50)},(_,i)=>group('part'+i,cloak.children.slice(i*50,i*50+50)));
 const guide=group('approvedGuide',[
  {name:'shadow',kind:'image',position:[18,-265],size:[380,54],image:theme.image.disc,colour:t.shadow,opacity:.5},
  // Native gradient parity is unverified; source contour and following masks
  // use the original SVG order, retaining the triangular dark hood opening.
  cloak,stroke('cloakOutline',p.cloak,t.outline,6,true),
  filled('hoodVoid',p.void,t.void),filled('bodyFold',p.fold,t.fold),
  ...p.foldLines.map((points,i)=>stroke('foldLine'+i,points,t.foldLine,7,false,.35)),
  ...p.sleeves.flatMap((points,i)=>[filled('sleeve'+i,points,t.sleeve),stroke('sleeveOutline'+i,points,t.sleeveOutline,5)]),
  stroke('staff',p.staff,t.staff,12),filled('staffGem',p.gem,t.gem),stroke('gemOutline',p.gem,t.gemOutline,4,true),
  filled('clasp',p.clasp,t.clasp),
 ]);
 // CSS: right -26, top55, width567, height580. Default SVG xMidYMid meet
 // gives a single 567/600 scale and 6.5px vertical letterbox, never X/Y stretch.
 guide.position=[t.origin[0]+300*t.scale-640,360-t.origin[1]-300*t.scale];
 guide.scale=[t.scale,t.scale];return guide;
}
