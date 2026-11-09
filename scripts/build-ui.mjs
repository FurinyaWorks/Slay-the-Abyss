import {resolveArtFeatures,artFeatureArgs,writeArtFeatures,artFeatureModule} from './art-features.mjs';
import {portraitRuntimeInputs,portraitSources,attachOfficialPortraits,attachLowpolyScenes,writePortraitModule} from './official-portraits.mjs';
import {attachReadyCardHosts,readyArtTemplates,writeReadyCardAssets,prepareReadyCardAssets,readyArtGroupTemplate,readyArtImageTemplate,writeReadyArtBinding,readyArtSourceInputs} from './art/ready-card-runtime.mjs';
import { backgroundInputs, backgroundSources, backgroundModule, attachOfficialBackground, writeBackgroundModule } from './official-background.mjs';
import {prepareMonsterArt,attachMonsterArt,monsterActorTemplate,writeMonsterActorBinding} from './monster-art.mjs';
import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, lstatSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { toLua } from './build-lua-data.mjs';
import { battleLayout, enemyPowerTemplate } from './ui-layout.mjs';
import { gameLayout } from './game-ui-layout.mjs';
import { withViewport } from './viewport-layout.mjs';
import { buildUiTheme } from './build-ui-theme.mjs';
import { buildMapUI } from './map-ui-layout.mjs';
import { deckCardTemplate } from './deck-ui-layout.mjs';
import { contentFiles } from './validate-data.mjs';
import { loadReleaseNotes, releaseInputPaths, releaseBuildArgs } from './release-notes.mjs';
import { nativeCardArtArgs, prepareNativeCardArt, attachNativeCardArt, bindNativeArtPresentation, nativeArtReceipt } from './card-art-samples.mjs';
import {loadPerformancePack} from './art/performance-pack.mjs';
import {writeLightweightProfile} from './lightweight-2d-profile.mjs';
import {compactBoundedCardFaces} from './lightweight-card-layout.mjs';
import {validateUiProfileOptions,uiProfileArgs,uiProfileModule,uiProfileSource} from './ui-profile.mjs';
import {validateV25Chrome,v25ChromeArgs} from './v25-profile.mjs';
import {applyV25BattleChrome} from './v25-battle-chrome.mjs';
import {applyV25TurnNoticeLayout} from './v25-turn-notice-layout.mjs';
import {prepareV25UiMasks,attachV25UiMasks} from './v25-ui-mask-assets.mjs';
import {v25Theme,applyV25BattleLayout,rebuildV25CardFaces} from './v25-layout.mjs';
import {applyV25BattleScene} from './v25-battle-scene.mjs';
import {applyV25PortraitProfile} from './v25-portrait-profile.mjs';
import {applyV25CharacterLayout} from './v25-character-layout.mjs';
import {applyV25MapLayout} from './v25-map-layout.mjs';
import {applyV25MenuLayout} from './v25-menu-layout.mjs';
import {applyV25ResultLayout} from './v25-result-layout.mjs';
import {applyV25NodeLayout,applyV25RewardLayout} from './v25-node-layout.mjs';
import {prepareV25CardTemplates} from './v25-card-templates.mjs';
import {writeV25CardBinding,v25CardModule} from './v25-card-binding.mjs';

export function assertNativeUiCapacity(layout) {
  const checkFonts = (control, path) => {
    if(control.opacity!==undefined&&control.kind!=='image')throw Error(`${path}: opacity requires an image control`);
    if(control.image!==undefined&&(!Number.isSafeInteger(control.image)||control.image<0))throw Error(`${path}: image requires a resolved numeric resource ID`);
    for(const [key,value] of [['colour',control.colour],['text.colour',control.text?.colour],['text.background',control.text?.background],['text.outlineColour',control.text?.outlineColour]]){
      if(value!==undefined&&!/^#[0-9a-fA-F]{6}$/.test(value))throw Error(`${path}: ${key} requires six RGB digits (#rrggbb); use its separate opacity field`);
    }
    for (const key of ['fontSize', 'minFontSize']) {
      const value = control.text?.[key];
      if (value !== undefined && (!Number.isInteger(value) || value < 14)) {
        throw new Error(`${path}: text.${key} must be an integer at least 14, got ${value}`);
      }
    }
  };
  const visit = (controls, path) => {
    if (controls.length > 60) throw new Error(`${path}: ${controls.length} direct children exceeds the platform limit of 60`);
    for (const control of controls) {
      const childPath = `${path}/${control.name}`;
      checkFonts(control, childPath);
      if (control.children?.length && control.kind !== 'container' && control.kind !== 'presetButton') {
        throw new Error(`${childPath}: only a container or presetButton may hold child controls`);
      }
      visit(control.children ?? [], childPath);
    }
  };
  checkFonts(layout, layout.name ?? 'native UI');
  visit(layout.controls ?? layout.children ?? [], layout.name ?? 'native UI');
}

function rejectInputOutputAliases(outputDirectory, extraInputs = []) {
  // Discover optional source identities without reading/decoding disabled drawings.
  const optionalInputs=[],visited=new Set();
  function optionalSources(directory){
    if(!existsSync(directory)||lstatSync(directory).isSymbolicLink())return;
    const identity=realpathSync.native(directory);if(visited.has(identity))return;visited.add(identity);
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const path=join(directory,entry.name);
      if(entry.isDirectory())optionalSources(path);
      else if(entry.isFile()||entry.isSymbolicLink()){
        if(!existsSync(path))continue;
        if(!statSync(path).isDirectory())optionalInputs.push(path);
      }
    }
  }
  optionalSources('art');
  const inputs = [...extraInputs,...optionalInputs, ...contentFiles.map(file => resolve('data', `${file}.json`)),
    resolve('data/presentation/ui_theme.json'), ...(existsSync('data/presentation/native-monster-art.json')?[resolve('data/presentation/native-monster-art.json')]:[]), resolve('data/presentation/traveler.zh-CN.json'),
    resolve('data/presentation/narrative.zh-CN.json'),
    // Imported battle/native layout modules read this theme relative to their source.
    fileURLToPath(new URL('../data/presentation/ui_theme.json', import.meta.url)),
    fileURLToPath(new URL('./ui-profile.mjs', import.meta.url)),
    fileURLToPath(new URL('./art/lightweight-2d-assets.mjs', import.meta.url)), ...releaseInputPaths()];
  const identities = inputs.map(input => ({ input, realPath: realpathSync.native(input),
    stat: statSync(input, { bigint: true }) }));
  const outputs = ['abyss_theme.lua', 'map-ui.json', 'abyss_map_layout.lua', 'abyss_map_controls.lua',
    'abyss_narrative.lua', 'abyss_presentation.lua', 'battle-ui.json', 'game-ui.json', 'abyss_ui_layout.lua',
    'game-ui-templates.json', 'abyss_ui_templates.lua', 'native-card-art-receipt.json', 'lightweight-2d.json', 'v25-theme.json', `${uiProfileModule}.lua`, `${backgroundModule}.lua`,
    'abyss_ready_card_binding.lua','abyss_ready_card_assets.lua','abyss_traveler_portrait_assets.lua',`${artFeatureModule}.lua`,'abyss_monster_art_data.lua','abyss_monster_actor_binding.lua','art-performance.json','art-render-v2.json'];
  outputs.push(`${v25CardModule}.lua`);
  for (const file of outputs) {
    const output = join(outputDirectory, file);
    let outputStat, outputRealPath;
    try {
      // Match the actual IO identity, as in the standalone Lua exporters.
      outputStat = statSync(output, { bigint: true });
      outputRealPath = realpathSync.native(output);
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    for (const { input, realPath, stat } of identities) {
      if (outputRealPath === realPath || (outputStat.dev === stat.dev && outputStat.ino === stat.ino)) {
        throw new Error(`Output must not overwrite an input file: ${input}`);
      }
    }
  }
}

export function buildUI(outputDirectory = 'build/lua', python = process.env.ABYSS_PYTHON || 'python', options = {}) {
  // Preflight the entire batch before any generated file can be changed.
  const v25BattleChrome=validateV25Chrome(options);
  if(v25BattleChrome&&options.performanceArt)throw Error('V25 reference mode cannot use compact art sampling');
  const v25Cards=options.v25CardAssets?prepareV25CardTemplates(options.v25CardAssets,{root:process.cwd()}):null;
  const v25Masks=options.v25UiMasks?prepareV25UiMasks(options.v25UiMasks):null;
  const nativePageLifecycle=validateUiProfileOptions(options);
  if(options.legacyCardFrames===true&&options.lightweight2d!==true)throw Error('Legacy card comparison requires the bounded 2D experiment');
  const flags = resolveArtFeatures(options);
  if(v25BattleChrome&&flags.selectionAvatar!==flags.battlePortrait)throw Error('V25 portraits require paired selection and battle source assets');
  const art = prepareNativeCardArt(options.nativeCardArt?.count===0?undefined:options.nativeCardArt);
  const readyArt = flags.cards && !art;
  const compact=options.performanceArt===true&&Object.values(flags).some(Boolean);
  const readyAssets = readyArt ? prepareReadyCardAssets({compact}) : {};
  const performance=compact?loadPerformancePack():null;
  if(flags.menuBackground)backgroundSources();
  portraitSources(process.cwd(),flags);
  rejectInputOutputAliases(outputDirectory, [...(v25Cards?.inputs.map(row=>row.path)??[]),...(v25Masks?.inputs.map(row=>row.path)??[]),...(flags.menuBackground?backgroundInputs:[]),...portraitRuntimeInputs(flags), ...(readyArt?readyArtSourceInputs():[]), ...(art?.inputPaths??[])].map(path=>resolve(path)));
  // The optional-art identity scan above also protects grass sources before decoding.
  const monsterArt=flags.monsters?prepareMonsterArt(options.monsterArt):null;
  if(flags.monsters&&!monsterArt)throw Error('Enabled monster artwork requires its registry');
  const releaseNotes = loadReleaseNotes({ releaseCandidate: options.releaseCandidate, workKey: options.workKey,
    sourceIdentity: options.sourceIdentity });
  const sourceTheme = JSON.parse(readFileSync('data/presentation/ui_theme.json', 'utf8').replace(/^\uFEFF/, ''));
  const theme=v25BattleChrome?v25Theme(sourceTheme):sourceTheme;
  const battle = battleLayout(), layout = withViewport(gameLayout(undefined, options), theme);
  const templates = [deckCardTemplate()];
  if(v25Cards)templates.push(...v25Cards.templates);
  if(v25Masks)templates.push(...v25Masks.templates);
  if(v25BattleChrome){
    applyV25BattleLayout(battle,theme);applyV25BattleLayout(layout,theme);
    rebuildV25CardFaces(layout,theme);
    for(const template of templates)rebuildV25CardFaces(template,theme);
  }
  if(flags.menuBackground)attachOfficialBackground(layout, templates);
  attachOfficialPortraits(layout,flags);attachLowpolyScenes(layout,flags);
  const genericTemplates=readyArtTemplates();
  templates.push(...(flags.cards||flags.menuBackground||flags.selectionAvatar||flags.battlePortrait?genericTemplates:genericTemplates.filter(t=>t.name===readyArtGroupTemplate)),
    monsterActorTemplate(monsterArt),enemyPowerTemplate());
  if((v25Cards||v25Masks)&&!templates.some(t=>t.name===readyArtImageTemplate))templates.push(genericTemplates.find(t=>t.name===readyArtImageTemplate));
  if(readyArt){attachReadyCardHosts(battle);attachReadyCardHosts(layout);attachReadyCardHosts(templates[0]);}
  if (art) { attachNativeCardArt(battle,art,{battleOnly:true}); attachNativeCardArt(layout,art); }
  attachMonsterArt(battle,monsterArt);attachMonsterArt(layout,monsterArt);
  if(v25BattleChrome){
    applyV25BattleChrome(battle,theme);applyV25BattleChrome(layout,theme);
    applyV25TurnNoticeLayout(battle,theme);applyV25TurnNoticeLayout(layout,theme);
    applyV25BattleScene(battle,theme);applyV25BattleScene(layout,theme);
    applyV25PortraitProfile(layout,theme);
    applyV25CharacterLayout(layout,theme);
    attachV25UiMasks(layout,v25Masks);
    applyV25MapLayout(layout,theme);
    applyV25NodeLayout(layout,theme);
    applyV25RewardLayout(battle,theme);
    applyV25ResultLayout(layout,theme);
    applyV25MenuLayout(layout,theme);
  }
  if(options.lightweight2d===true&&!options.legacyCardFrames){
    compactBoundedCardFaces(battle);compactBoundedCardFaces(layout,templates);
  }
  for (const tree of [battle, layout, ...templates]) assertNativeUiCapacity(tree);
  const rendered = spawnSync(python, ['tools/render_traveler_cards.py', 'data/cards.json', 'data/presentation/traveler.zh-CN.json'],
    { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024, env: { ...process.env, PYTHONUTF8: '1' } });
  if (rendered.status !== 0) throw new Error(rendered.stderr || rendered.error?.message || 'Presentation renderer failed');
  const source = JSON.parse(rendered.stdout);
  const cards = Object.fromEntries(source.cards.map(card => [card.id, card]));
  if (art) bindNativeArtPresentation(cards,art);

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(join(outputDirectory,'abyss_component_binding.lua'),'-- Original-component comparison is opt-in.\nreturn {schemaVersion=1,enabled=false}\n');
  writeV25CardBinding(outputDirectory);
  writeFileSync(join(outputDirectory,uiProfileModule+'.lua'),uiProfileSource(nativePageLifecycle));
  if(options.lightweight2d===true)writeLightweightProfile(outputDirectory);
  else rmSync(join(outputDirectory,'lightweight-2d.json'),{force:true});
  if(performance)writeFileSync(join(outputDirectory,'art-performance.json'),JSON.stringify(performance));
  else rmSync(join(outputDirectory,'art-performance.json'),{force:true});
  writeFileSync(join(outputDirectory,'art-render-v2.json'),JSON.stringify({profile:'native-v2',hiddenBuild:true,cache:true,revealGroupsPerFrame:4}));
  writeArtFeatures(outputDirectory,flags);writeMonsterActorBinding(outputDirectory);
  writeBackgroundModule(outputDirectory,{enabled:flags.menuBackground});writePortraitModule(outputDirectory,{...flags,v25BattleChrome});
  writeReadyArtBinding(outputDirectory);writeReadyCardAssets(outputDirectory,{prepared:readyAssets});
  const variantTheme=join(outputDirectory,'v25-theme.json');
  if(v25BattleChrome)writeFileSync(variantTheme,JSON.stringify(theme));
  else rmSync(variantTheme,{force:true});
  buildUiTheme(v25BattleChrome?variantTheme:undefined, undefined, join(outputDirectory, 'abyss_theme.lua'));
  buildMapUI(outputDirectory);
  writeFileSync(join(outputDirectory,'abyss_monster_art_data.lua'),`-- Generated from the bounded native monster registry.\nreturn ${toLua(monsterArt??{})}\n`);
  const narrative = JSON.parse(readFileSync('data/presentation/narrative.zh-CN.json', 'utf8'));
  narrative.codeVersion = releaseNotes.build.version;
  writeFileSync(join(outputDirectory, 'abyss_narrative.lua'), `-- Generated from the approved narrative copy source.\nreturn ${toLua(narrative)}\n`, 'utf8');
  writeFileSync(join(outputDirectory, 'abyss_presentation.lua'), `-- Generated from the checked Traveler presentation.\nreturn ${toLua(cards)}\n`, 'utf8');
  writeFileSync(join(outputDirectory, 'battle-ui.json'), JSON.stringify(battle, null, 2) + '\n', 'utf8');
  writeFileSync(join(outputDirectory, 'game-ui.json'), JSON.stringify(layout, null, 2) + '\n', 'utf8');
  writeFileSync(join(outputDirectory, 'abyss_ui_layout.lua'), `-- Native layout fixture generated from the import tree.\nreturn ${toLua(layout.controls)}\n`, 'utf8');
  writeFileSync(join(outputDirectory, 'game-ui-templates.json'), JSON.stringify(templates, null, 2) + '\n', 'utf8');
  writeFileSync(join(outputDirectory, 'abyss_ui_templates.lua'), `-- Native template fixtures generated from the import tree.\nreturn ${toLua(Object.fromEntries(templates.map(template => [template.name, template])))}\n`, 'utf8');
  if (art) writeFileSync(join(outputDirectory,'native-card-art-receipt.json'),JSON.stringify(nativeArtReceipt(art),null,2)+'\n');
  else rmSync(join(outputDirectory,'native-card-art-receipt.json'),{force:true});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const chrome=v25ChromeArgs(process.argv.slice(2));
    const profile=uiProfileArgs(chrome.args),args = profile.args, experimentalCharacters = args.includes('--experimental-characters'),lightweight2d=args.includes('--lightweight-2d'),legacyCardFrames=args.includes('--legacy-card-frames');
    const features=artFeatureArgs(args.filter(arg => !['--experimental-characters','--lightweight-2d','--legacy-card-frames'].includes(arg)));
    const native = nativeCardArtArgs(features.args);
    const { paths, options } = releaseBuildArgs(native.args);
    if (paths.length > 1) throw new Error('Expected at most one output directory');
    buildUI(paths[0], undefined, { v25BattleChrome:chrome.v25BattleChrome,v25CardAssets:chrome.v25CardAssets,v25UiMasks:chrome.v25UiMasks, experimentalCharacters, lightweight2d, legacyCardFrames, nativePageLifecycle:profile.nativePageLifecycle, ...options, artFeatures:features.artFeatures, nativeCardArt:native.nativeCardArt, readyCardArt:native.readyCardArt });
    console.log('Native battle UI and Traveler display module built.');
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
