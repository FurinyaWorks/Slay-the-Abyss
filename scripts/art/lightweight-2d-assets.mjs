import {createHash} from 'node:crypto';

// Original bounded geometry. Native white rectangle and right triangle IDs are
// already used in art/lowpoly-select/select-lowpoly.json; no imported art bytes.
const WHITE = 100001;
const TRIANGLE = 100003;
const rgba = hex => [...hex.match(/../g).map(byte => parseInt(byte, 16)), 255];
const C = Object.freeze({
  outline: '35313e', shade: '736275', hairDark: 'b98b45', hair: 'e5bf69',
  hairLight: 'ffe3a0', skinShade: 'd5a18b', skin: 'f3ceb1', cream: 'faf1db',
  cloth: 'e1deef', clothShade: 'ada5c8', gold: 'dba44c', goldLight: 'ffe0a0',
  geo: 'f2bc4c', geoShade: 'a86b2c', steel: 'c2d5de', steelLight: 'effaff',
});
const root = width => [0, 0, width, width, .5, .5, .5, .5, .5, .5, 1, 1, 0];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const round = value => Math.round(value * 1000) / 1000;
function rectangle(x, y, w, h, color, width = 133) {
  const scale = width / 64;
  return [WHITE, ...[x, y, w, h].map(value => round(value * scale)),
    .5, .5, .5, .5, .5, .5, 1, 1, 0, ...rgba(C[color] ?? color)];
}

function travelerRows() {
  // Back to front, all pieces share one parent for animation. 64-unit canvas.
  return [
    // Floating cape, long hair and silhouette.
    [-13,-4,10,35,'outline'], [-17,-10,6,22,'outline'],
    [-12,-4,7,31,'clothShade'], [-16,-9,4,18,'cloth'],
    [-14,-20,5,4,'gold'], [-13,5,7,27,'hairDark'],
    [-12,7,5,25,'hair'], [-11,-6,5,8,'hairLight'],
    // Boots and legs. Dark outline remains readable on warm backgrounds.
    [-6,-23,8,12,'outline'], [6,-23,8,12,'outline'],
    [-6,-21,5,10,'skinShade'], [6,-21,5,10,'skin'],
    [-7,-27,9,4,'outline'], [6,-27,9,4,'outline'],
    [-7,-26,7,2,'gold'], [6,-26,7,2,'gold'],
    // White dress and navy underskirt, with a restrained gold hem.
    [0,-11,22,15,'outline'], [0,-10,18,13,'clothShade'],
    [-5,-10,7,13,'cream'], [5,-10,7,13,'cloth'],
    [0,-16,20,3,'gold'], [0,-3,15,12,'outline'],
    [0,-3,12,10,'cream'], [4,-3,3,10,'clothShade'],
    [0,-6,13,2,'gold'], [0,1,4,5,'geoShade'], [0,2,2,3,'geo'],
    // Arms: relaxed left sleeve and sword hand to the right.
    [-10,-2,5,10,'outline'], [-10,-1,3,8,'skin'],
    [-10,2,5,4,'cream'], [10,-2,5,10,'outline'],
    [10,-1,3,8,'skin'], [10,2,5,4,'cloth'],
    // Sword has a single clean highlight, never separate per-pixel tweens.
    [20,-9,5,27,'outline'], [20,-8,3,24,'steel'],
    [19,-8,1,23,'steelLight'], [20,5,3,7,'gold'],
    [20,3,11,3,'outline'], [20,3,9,1,'goldLight'],
    [14,1,5,3,'skin'],
    // Head silhouette, asymmetric fringe, tiny flower and amber eyes.
    [-1,19,23,24,'outline'], [-1,22,21,19,'hairDark'],
    [-1,17,17,16,'skinShade'], [0,18,15,14,'skin'],
    [-1,27,19,7,'hair'], [-7,23,7,9,'hair'],
    [5,25,7,8,'hairLight'], [8,20,3,12,'hair'],
    [-5,28,8,3,'hairLight'], [-3,21,8,4,'hair'],
    [-4,17,3,2,'outline'], [4,17,3,2,'outline'],
    [-4,16,2,2,'gold'], [4,16,2,2,'gold'],
    [1,12,3,1,'skinShade'], [-12,24,5,5,'cream'],
    [-12,24,2,2,'geo'],
  ].map(row => rectangle(...row));
}

function avatarRows() {
  return [
    [0,-18,41,19,'outline'], [0,-17,37,15,'clothShade'],
    [-9,-17,15,15,'cream'], [10,-17,13,15,'cloth'],
    [0,-14,4,6,'geo'], [-19,-9,7,25,'hairDark'],
    [-18,-9,4,24,'hair'], [0,6,39,41,'outline'],
    [0,11,35,31,'hairDark'], [0,3,29,29,'skinShade'],
    [1,4,25,26,'skin'], [-1,23,33,10,'hair'],
    [-12,16,11,14,'hair'], [10,19,13,12,'hairLight'],
    [15,10,6,20,'hair'], [-8,25,13,4,'hairLight'],
    [-4,13,15,6,'hair'], [-7,3,5,3,'outline'],
    [7,3,5,3,'outline'], [-7,1,3,3,'gold'], [7,1,3,3,'gold'],
    [-8,4,1,1,'cream'], [6,4,1,1,'cream'],
    [2,-6,5,1,'skinShade'], [-20,19,9,9,'cream'],
    [-20,19,3,3,'geo'], [-19,-21,6,3,'gold'],
  ].map(row => rectangle(...row, 96));
}

function compact(width, display, rows) {
  return {
    root: root(width), width, count: rows.length, display, rows,
    renderProfile: 'bounded-2d-v1', cache: true, runtimeV2: true, rectanglesOnly: true,
    sourceSha256: digest(rows), jsonSha256: digest(rows), artworkSha256: digest(rows),
    artworkSource: 'original-native-2d-geometry-v1',
  };
}
function lowpoly(width, height, rows) {
  return {root: root(width), width, height, count: rows.length, rows,
    renderProfile: 'lowpoly-v1', cache: true, runtimeV2: true,
    sourceSha256: digest(rows), jsonSha256: digest(rows), artworkSha256: digest(rows),
    artworkSource: 'original-native-2d-geometry-v1'};
}
function landscapeRows() {
  const rows = [];
  const add = (id, x, y, w, h, color, rotation = 0, alpha = 255) => {
    const values = rgba(color); values[3] = alpha;
    rows.push([id, x, y, w, h, .5, .5, .5, .5, .5, .5, 1, 1,
      rotation, ...values, 0, 0]);
  };
  const rect = (...args) => add(WHITE, ...args);
  const tri = (...args) => add(TRIANGLE, ...args);
  // Quiet purple sky, warm horizon, layered distant peaks and one ruined tower.
  rect(0,0,1280,720,'171821');
  rect(0,-38,1280,360,'292538');
  rect(0,-115,1280,170,'443441');
  rect(0,-151,1280,70,'6a4b4d');
  rect(-390,130,100,100,'e5bd83',0,145);
  tri(-475,-85,370,355,'3a3448');
  tri(-203,-93,430,390,'40384d',180);
  tri(84,-92,440,330,'3b3448');
  tri(413,-115,480,395,'342f43',180);
  tri(-520,-167,330,220,'242636');
  tri(-250,-171,490,240,'2e2a3b',180);
  tri(182,-164,440,270,'292737');
  tri(520,-177,330,220,'252635',180);
  rect(0,-282,1280,158,'171d2b');
  tri(-460,-248,420,100,'202232');
  tri(308,-253,580,108,'202332',180);
  // Right-side ruined stone arch keeps center-left clear for menu text.
  rect(428,-88,86,295,'191e2b');
  rect(423,-83,64,280,'33303b');
  rect(408,-81,18,283,'49404a');
  rect(428,66,112,19,'51424b');
  rect(432,82,95,13,'6d5052');
  rect(444,101,48,25,'33303b');
  rect(428,-68,54,92,'141c2a');
  rect(407,-68,8,97,'a27352',0,130);
  rect(428,-125,68,11,'56414a');
  rect(427,-166,93,12,'342c3a');
  rect(350,-209,223,15,'252736');
  rect(326,-225,290,16,'1e2331');
  // A few foreground pillars and rock ledges, with restrained amber trims.
  rect(-536,-229,91,168,'151d2b');
  rect(-536,-140,116,12,'43343e');
  rect(-555,-228,9,164,'59434a');
  rect(-144,-284,260,14,'332d3b');
  tri(-294,-278,118,48,'40313c');
  rect(89,-279,95,12,'4c3941');
  rect(388,-277,180,12,'3f303c');
  // Two broad soft veils preserve the existing dark, legible foreground.
  rect(0,284,1280,152,'0c111d',0,110);
  rect(0,-327,1280,66,'0c111d',0,150);
  return rows;
}

export function lightweightAssets() {
  const figure = travelerRows();
  return {
    avatar96: compact(96, 32, avatarRows()),
    battle133: compact(133, 400 / 3, figure),
    lowpolyHero: lowpoly(133, 133, figure.map(row => [...row, 0, 0])),
    lowpolyLand: lowpoly(1280, 720, landscapeRows()),
  };
}
