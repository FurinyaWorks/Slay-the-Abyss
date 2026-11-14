import { nativeControls, nativeTheme } from './native-ui-theme.mjs';

// Presentation-only controls for the title vista, the opening cinematic and the
// shop merchant. Every picture is a tinted shape from the platform picture library;
// Lua moves, scales and recolours them and never reads rules from here.
function helpers(theme) {
  const controls = nativeControls(theme);
  const picture = (name, values, image, colour, extra = {}) => ({ name, kind: 'image',
    position: values.slice(0, 2), size: values.slice(2, 4), image, colour, ...extra });
  // Typed lines grow from a fixed left edge instead of re-centring every character.
  const leftText = (name, values, content, fontSize, colour, valign = 'middle') => {
    const control = controls.text(name, values, content, fontSize, colour);
    return { ...control, text: { ...control.text, align: 'left', valign } };
  };
  return { ...controls, picture, leftText };
}

export function vistaControl(theme = nativeTheme, name = 'vista') {
  const { picture, plate } = helpers(theme);
  const v = theme.layout.vista, c = theme.color, im = theme.image, tone = c.vista;
  const [sx, sy] = v.seal, centre = [0, 0];
  const seal = { name: 'seal', kind: 'container', position: [sx, sy], size: v.seal.slice(2), children: [
    picture('core', [...centre, v.seal[2] * 0.9, v.seal[3] * 0.9], im.glow, c.goldBright, { opacity: 0.55 }),
    picture('ring', [...centre, ...v.seal.slice(2)], im.ring, c.gold, { opacity: 0.8 }),
    picture('heart', [...centre, ...v.sealCore.slice(2)], im.disc, c.goldBright),
  ] };
  return { name, kind: 'container', size: v.cover.slice(2), children: [
    plate('sky', v.cover, tone.sky),
    picture('halo', v.halo, im.glowWide, c.geoDeep, { opacity: 0.32 }),
    ...v.beams.map((frame, i) => picture(`beam${i + 1}`, frame, im.beam, c.goldDim, { opacity: 0.16 })),
    picture('towerBack', v.towerBack, im.ruin, tone.far),
    picture('tower', v.tower, im.ruin, tone.mid),
    seal,
    ...v.shards.map((frame, i) => picture(`shard${i + 1}`, frame, im.shards, c.goldDim)),
    ...v.pillars.map((frame, i) => picture(`pillar${i + 1}`, frame, im.ruin, tone.near)),
    picture('wall', v.wall, im.ruinWall, tone.near),
    plate('ground', v.ground, tone.ground),
    picture('horizon', v.horizon, im.fadeLine, c.geoDeep, { opacity: 0.45 }),
    ...v.motes.map((at, i) => picture(`mote${i + 1}`, [...at, v.mote, v.mote], im.disc, c.goldBright)),
    picture('vignette', v.vignette, im.vignette, tone.shade, { opacity: 0.85 }),
  ] };
}

export function prologueControl(theme = nativeTheme) {
  const { picture, plate } = helpers(theme), p = theme.layout.prologue;
  // One native Geo mark, no imported save, vector reconstruction or dynamic children.
  return { name: 'prologuePanel', kind: 'container', size: [...theme.canvas.base], visible: false, children: [
    plate('fade', [0, 0, ...theme.canvas.base], p.shade),
    { name: 'seal', kind: 'container', size: p.seal.slice(2), children: [
      picture('icon', p.seal, theme.icon.geo, p.ink),
      plate('ruleLeft', p.ruleLeft, p.ink),
      plate('ruleRight', p.ruleRight, p.ink),
    ] },
    { name: 'blocker', kind: 'cursorArea', size: [...theme.canvas.base], focusable: false },
  ] };
}

// Old-road merchant medallion (official bust 112030); also reused as the Neow stand-in figure.
export function merchantPortrait(theme = nativeTheme, [px, py, pw, ph], name = 'portrait') {
  const { picture } = helpers(theme);
  const c = theme.color, im = theme.image, tone = c.merchant, b = theme.space.border;
  const r = pw / 2;
  // Existing native human bust 112030 replaces the geometric silhouette; the
  // shop context supplies the merchant role, without claiming its catalog profession.
  const portrait = { name, kind: 'container', position: [px, py], size: [pw, ph], children: [
    picture('aura', [0, 0, pw * 1.5, ph * 1.5], im.glow, c.geoDeep, { opacity: 0.5 }),
    picture('rim', [0, 0, pw + b * 2, ph + b * 2], im.disc, c.gold),
    picture('field', [0, 0, pw, ph], im.disc, c.vista.mid),
    picture('lanternGlow', [-r * 0.5, -r * 0.42, r * 1.1, r * 1.1], im.glow, tone.lantern, { opacity: 0.45 }),
    picture('bust', [0, 0, pw * 0.92, ph * 0.92], im.merchant, '#FFFFFF'),
  ] };
  return portrait;
}

export function merchantControl(theme = nativeTheme) {
  const { picture, plate, text, leftText, hit } = helpers(theme);
  const m = theme.layout.merchant, c = theme.color, im = theme.image, tone = c.merchant, b = theme.space.border;
  const [bx, by, bw, bh] = m.box, [px, py, pw, ph] = m.portrait;
  const portrait = merchantPortrait(theme, [px, py, pw, ph]);
  // Theme frames are in node-panel units; children sit relative to the merchant's own frame.
  const [fx, fy] = m.frame, at = ([x, y, ...rest]) => [x - fx, y - fy, ...rest];
  portrait.position = at(m.portrait).slice(0, 2);
  const [nx, ny, nw] = at(m.name), line = theme.layout.nativeText.lineHeight;
  if (m.bubble) {
    const style = m.bubble, r = style.radius;
    const rounded = (name, w, h, radius, colour) => ({ name, kind: 'container', size: [w, h], children: [
      plate('vertical', [0, 0, w - radius * 2, h], colour),
      plate('horizontal', [0, 0, w, h - radius * 2], colour),
      ...[-1, 1].flatMap(x => [-1, 1].map(y => picture(`corner${x}_${y}`,
        [x * (w / 2 - radius), y * (h / 2 - radius), radius * 2, radius * 2], 100002, colour))),
    ] });
    const [tw, th] = style.tail;
    const bubble = { name: 'bubble', kind: 'container', position: at(m.box).slice(0, 2), size: [bw, bh], children: [
      picture('tail', [px - bx, -bh / 2 - th / 2 + b, tw, th], 100003, style.edge, { rotation: 180 }),
      picture('tailFill', [px - bx, -bh / 2 - th / 2 + b * 2, tw - b * 2, th - b * 2], 100003, style.fill, { rotation: 180 }),
      rounded('rim', bw, bh, r, style.edge),
      rounded('paper', bw - b * 2, bh - b * 2, r - b, style.fill),
    ] };
    const lineText = leftText('line', at(m.line), '', style.fontSize, style.ink);
    lineText.text.outline = false;
    const talkSize = [m.frame[2] - b * 4, m.frame[3]];
    // Keep the established handles for reference transformers; none draws a bar.
    const hidden = control => ({ ...control, visible: false });
    return { name: 'merchant', kind: 'container', position: [fx, fy], size: m.frame.slice(2), visible: false, children: [
      hidden(plate('border', at(m.box), style.edge)), hidden(plate('panel', at(m.box), style.fill)),
      hidden(plate('accent', at(m.box), style.edge)), hidden(plate('namePlate', at(m.name), style.fill)),
      hidden(text('name', [nx, ny, nw, line], '旧路商人', theme.font.label, style.ink)),
      { name: 'portrait', kind: 'container', position: at(m.portrait).slice(0, 2), size: [pw, ph], children: [
        picture('lanternGlow', [0, -ph * .08, pw * 1.12, ph * 1.12], im.glow, tone.lantern, { opacity: .18 }),
        picture('bust', [0, 0, pw, ph], im.merchant, '#FFFFFF'),
      ] },
      bubble,
      lineText,
      picture('next', at(m.next), im.diamond, style.edge),
      // The clear shelf-side lane owns a single existing listener. When the
      // bubble is folded, the same target lets the player reread from page one.
      { name: 'talk', kind: 'container', position: [0, 0], size: talkSize,
        children: [hit(talkSize)] },
    ] };
  }
  return { name: 'merchant', kind: 'container', position: [fx, fy], size: m.frame.slice(2), visible: false, children: [
    plate('border', at([bx, by, bw + b * 2, bh + b * 2]), c.goldDim),
    { ...plate('panel', at(m.box), c.panelSunken), opacity: 0.96 },
    plate('accent', at([bx + pw / 2, by + bh / 2 - b, bw - pw - theme.space.xl, b]), c.gold),
    portrait,
    plate('namePlate', at(m.name), c.panelSunken),
    text('name', [nx, ny, nw - theme.space.s, line], '旧路商人', theme.font.label, c.parchment),
    leftText('line', at(m.line), '', theme.font.body, c.text, 'top'),
    picture('next', at(m.next), im.diamond, c.gold),
    // Tapping the dialogue only reveals or advances text; it owns no shop action.
    { name: 'talk', kind: 'container', position: at(m.box).slice(0, 2), size: m.box.slice(2), children: [hit(m.box.slice(2))] },
  ] };
}
