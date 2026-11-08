// Candidate-local geometry simplification. Semantic parents and live fields stay intact.
const children=node=>node?.controls??node?.children??[];
const child=(node,name)=>children(node).find(entry=>entry.name===name);
const decorativeGroups=face=>[
 ...['roundShadow','roundFrame','roundBody','tagEdge','tagBody'].map(name=>child(face,name)),
 ...['edge','body'].map(name=>child(child(face,'blockedPill'),name)),
 ...['attack','skill','power'].flatMap(kind=>['edge','well'].map(name=>child(child(child(face,'skin'),kind),name))),
];
function flatDecoration(group){
 if(!group||group.kind!=='container'||!Array.isArray(group.children)||!group.children.length)
  throw Error('Invalid card decoration container');
 if(group.children.length===1&&group.children[0].name==='flat'&&group.children[0].kind==='image'
   &&group.children[0].image===100001)return null;
 for(const image of group.children){
  if(image.kind!=='image'||![100001,100002,100003].includes(image.image)||image.children?.length
    ||!Array.isArray(image.size)||image.size.length!==2||image.size.some(n=>!Number.isFinite(n)||n<0)
    ||image.position?.some(n=>!Number.isFinite(n)))throw Error('Unexpected card decoration image');
 }
 const first=group.children[0];
 if(group.children.some(image=>image.colour!==first.colour||image.opacity!==first.opacity))throw Error('Mixed card decoration colors');
 const bounds=axis=>[
  Math.min(...group.children.map(image=>(image.position?.[axis]??0)-image.size[axis]/2)),
  Math.max(...group.children.map(image=>(image.position?.[axis]??0)+image.size[axis]/2)),
 ];
 const x=bounds(0),y=bounds(1);
 return {name:'flat',kind:'image',position:[(x[0]+x[1])/2,(y[0]+y[1])/2],size:[x[1]-x[0],y[1]-y[0]],image:100001,
  ...(first.colour===undefined?{}:{colour:first.colour}),...(first.opacity===undefined?{}:{opacity:first.opacity})};
}
export function compactBoundedCardFaces(layout,templates=[]){
 if(!layout||!Array.isArray(templates))throw Error('Expected a native layout and template array');
 const replacements=[],visited=new Set();let cardHosts=0,removedControls=0;
 const visit=node=>{
  if(visited.has(node))return;visited.add(node);
  if(child(node,'roundFrame')&&child(node,'skin')&&child(node,'costDisc')){
   cardHosts++;
   for(const group of decorativeGroups(node)){
    const flat=flatDecoration(group);
    if(flat){replacements.push([group,flat]);removedControls+=group.children.length-1;}
   }
  }
  for(const entry of children(node))visit(entry);
 };
 // Validate the whole batch before replacing any descendants.
 for(const tree of [layout,...templates])visit(tree);
 for(const[group,flat]of replacements)group.children=[flat];
 return {cardHosts,removedControls};
}
