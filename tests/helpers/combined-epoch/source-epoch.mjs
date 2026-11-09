// Preserve the complete Encounter formation predecessor as an importable epoch.
export * from './pre-treasure-source-source-epoch.mjs';
import {sourceEpoch as preTreasureSourceEpoch} from './pre-treasure-source-source-epoch.mjs';
import {extendTreasureSourceEpoch} from '../treasure-source-source-epoch.mjs';
export {preTreasureSourceEpoch};
// Current public consumers authenticate all 52 changed raw owners on every call.
export const sourceEpoch=extendTreasureSourceEpoch(preTreasureSourceEpoch);
