/** Art-only candidate: reveal native 3D scenery through the existing title UI.
 * Never enable on a save without the ARTMENU_ scenery + a fixed camera.
 * Changes no Run/Combat handlers, keyboard flow, clickable hit areas or numbers.
 */
const marker=Symbol('monolith-menu-applied');
export function applyMonolithMenuOverlay(layout,theme,{opacity=.08}={}){
 if(!Number.isFinite(opacity)||opacity<0||opacity>.25)throw Error('Invalid title veil');
 const canvasBackdrop=(layout.controls??[]).find(x=>x.name==='canvasBackdrop');
 if(canvasBackdrop&&canvasBackdrop.kind==='image')canvasBackdrop.visible=false;
 const root=(layout.controls??layout.children??[]).find(x=>x.name==='stage')??layout;
 const menu=(root.controls??root.children??[]).find(x=>x.name==='menuPanel');
 if(!menu)throw Error('Missing main menu');
 if(menu[marker])throw Error('Monolith overlay already applied');
 const controls=menu.children??menu.controls??[];
 const matches=controls.filter(x=>x.name==='backdrop');
 if(matches.length!==1||matches[0].kind!=='image')throw Error('Expected one image backdrop');
 const backdrop=matches[0];backdrop.image=theme.image.rect;backdrop.colour='#0C1822';backdrop.opacity=opacity;
 for(const name of ['vista','heroArt','lowpolyVeil','titleBand','v25Background','officialBackground']){
  const item=controls.find(c=>c.name===name);if(item)item.visible=false;
 }
 // Symbol property cannot enter JSON/native layout encoder.
 menu[marker]=true;
 return layout;
}
