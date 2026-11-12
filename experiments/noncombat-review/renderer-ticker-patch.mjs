import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

export const rendererBefore='9e89976ce304a896d8c5e57ce40545f795b8668a4a5460c8459adceb9a52d15a';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');

// Simulator-only: progress the Application's normal rendering lifecycle.
// No SDK pointer, step, game clock, Lua source or GIL changes are made here.
export function patchRendererTicker(source){
 assert.equal(digest(source),rendererBefore,'unexpected Simulator renderer');
 assert.equal(source.split('this.app.render()').length-1,3);
 assert.equal(source.split('this.app?.render()').length-1,2);
 return source.replaceAll('this.app.render()','this.app.ticker.update(performance.now())')
  .replaceAll('this.app?.render()','this.app?.ticker.update(performance.now())');
}
