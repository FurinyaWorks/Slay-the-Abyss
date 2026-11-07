// Presentation roles only. Combat/Run retain the original enemy ID, name and rules.
// Source clips are selections from the installed editor-scraped catalogue, not
// newly authored animation IDs. Source hashes allow a later catalogue review.
export const modelSources=Object.freeze({
  assets:{path:'src/scene/asset-catalog.json',sha256:'329d74f9621cb8282beccfcfb65f4e9a3590e9359bdeeb2f1a92b138e05c5529'},
  animations:{path:'src/scene/media/creature-animations.json',sha256:'9d301576fb7f6b505f9c544adb085b5a5e7f59b21655fe4dca6f00cde93f8d8a'},
  bodyEvidence:'Planning envelope after the declared scale; not measured model bounds. Requires official-client calibration.',
  runtimeStatus:'candidate-only; native spawn, weapon attachments and motion remain unverified for this candidate',
});
const model=(spec,width,height)=>Object.freeze({...spec,body:Object.freeze({width,height}),bodyEvidence:modelSources.bodyEvidence,runtimeStatus:modelSources.runtimeStatus});
export const productionModels=Object.freeze([
  model({model:1,name:'遗迹守卫',asset:30005001,idle:5001001,attack:5001002,attackSeconds:3.58,hit:5001011,hitSeconds:2.16,scale:.5,role:'heavy-construct'},1.35,2.2),
  model({model:2,name:'大型风史莱姆',asset:30005003,idle:5003001,attack:5003002,attackSeconds:2.28,hit:null,scale:.85,role:'flying-creature'},1.25,1.7),
  model({model:3,name:'打手丘丘人',asset:30007001,idle:7001007,attack:7001012,attackSeconds:2.15,hit:null,scale:1.1,role:'small-melee'},1.05,1.85),
  model({model:4,name:'大型水史莱姆',asset:30005006,idle:5006001,attack:5006002,attackSeconds:2.76,hit:null,scale:.9,role:'fluid-creature'},1.3,1.7),
  model({model:5,name:'大型岩史莱姆',asset:30005008,idle:5008001,attack:5008002,attackSeconds:2.76,hit:null,scale:.85,role:'armoured-creature'},1.3,1.7),
  model({model:6,name:'盗宝团·斥候',asset:30006009,idle:6009002,attack:6009004,attackSeconds:2.33,hit:null,scale:1,role:'light-humanoid'},.95,1.8),
  model({model:7,name:'镀金旅团·沙中净水',asset:30006012,idle:6012002,attack:6012003,attackSeconds:3.66,hit:null,scale:1,role:'caster'},1.05,1.85),
  model({model:8,name:'火斧丘丘暴徒',asset:30005002,idle:5002001,attack:5002003,attackSeconds:4.28,hit:null,scale:.65,role:'heavy-melee',motionRisk:'Known clip includes a near-three-metre lunge before scaling; actual lane recovery must be verified.'},1.4,2.1),
  model({model:9,name:'木盾丘丘暴徒',asset:30006005,idle:6005001,attack:6005003,attackSeconds:2.17,hit:null,scale:.65,role:'shield-bearer'},1.4,2.1),
]);
export const fallbackModel=1;
// Scope: actual Act 1/2 definitions including their event and summoned enemies.
// Unsupported exact silhouettes explicitly reuse a readable native role below.
export const enemyModels=Object.freeze({
  acid_slime_l:4,acid_slime_m:4,acid_slime_s:4,slime_boss:4,
  spike_slime_l:5,spike_slime_m:5,spike_slime_s:5,green_louse:5,red_louse:5,jaw_worm:5,shelled_parasite:5,
  mad_gremlin:3,fat_gremlin:3,shield_gremlin:3,sneaky_gremlin:3,wizard_gremlin:7,torch_head:3,
  lagavulin:1,lagavulin_awake:1,guardian:1,automaton:1,
  looter:6,blue_slaver:6,red_slaver:6,mugger:6,taskmaster:6,bandit_leader:6,bandit_pointy:6,
  cultist:7,chosen:7,mystic:7,collector:7,
  gremlin_nob:8,gremlin_leader:8,champ:8,bandit_bear:8,centurion:9,
  byrd:2,fungi_beast:5,snake_plant:7,snecko:5,
  book_of_stabbing:1,bronze_orb:1,sentry:1,hexaghost:1,spheric_guardian:1,
});
export const silhouetteFallbacks=Object.freeze({
  red_louse:'Geo slime substitutes for an uninstalled pyro-slime variant.',
  byrd:'Anemo slime substitutes for a bird without a verified complex-creature animation route.',
  fungi_beast:'Geo slime substitutes for the ordinary-creature mushroom model.',
  snake_plant:'Caster substitutes for the unverified plant animation route.',
  snecko:'Geo slime substitutes for the unverified saurian animation route.',
  book_of_stabbing:'Guard substitutes for the unimplemented book/knife silhouette.',
  bronze_orb:'Guard substitutes for the unimplemented orb silhouette.',
  sentry:'Guard substitutes for the unimplemented floating sentry silhouette.',
  hexaghost:'Guard substitutes for the unimplemented six-flame silhouette.',
  spheric_guardian:'Guard substitutes for the unimplemented spherical silhouette.',
});
export function modelForEnemy(enemyId){return Object.hasOwn(enemyModels,enemyId)?enemyModels[enemyId]:fallbackModel;}
