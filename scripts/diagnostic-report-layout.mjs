import { nativeControls, nativeTheme } from './native-ui-theme.mjs';

// A single screenshot is the export format: no OS clipboard, network, or
// simulated FPS. All content is static except the ten text lines refreshed
// once when the player opens the read-only report.
export function screenshotReport(theme = nativeTheme) {
  const { plate, text, button } = nativeControls(theme);
  const { color: c, font: f } = theme;
  const rows = Array.from({ length: 10 }, (_, i) => {
    const row = text('line' + (i + 1), [0, 178 - i * 38, 768, 34], '', f.small, c.text);
    row.text.align = 'left';
    return row;
  });
  return { name: 'diagnosticsPanel', kind: 'container', size: [...theme.canvas.base],
    visible: false, children: [
      plate('veil', [0, 0, ...theme.canvas.base], c.backdropVeil),
      { name: 'blocker', kind: 'cursorArea', size: [...theme.canvas.base], focusable: false },
      plate('border', [0, 0, 850, 658], c.goldDim),
      plate('face', [0, 0, 846, 654], c.panel),
      { name: 'catch', kind: 'cursorArea', size: [850, 658], focusable: false },
      text('title', [0, 273, 780, 48], '运行诊断 · 截图发给 AI', f.heading, c.goldBright),
      text('caption', [0, 229, 780, 36], '仅显示当前游戏状态，不含系统性能数据', f.small, c.textDim),
      plate('rule', [0, 207, 768, 2], c.goldDim),
      ...rows,
      text('notice', [0, -222, 790, 28], '无法获取真机 FPS、GPU 或系统内存', f.small, c.textMuted),
      text('hint', [0, -253, 790, 28], '截图后点「返回菜单」，不会结束本局', f.small, c.textDim),
      button('close', [0, -300, 280, 44], '返回菜单',
        { inset: [8, 4], fontSize: f.small, border: c.goldDim }),
    ] };
}
