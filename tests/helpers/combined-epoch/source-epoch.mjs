// Frozen predecessors retain every original source identity and contract.
export * from './pre-silent-potion-source-epoch.mjs';
import {sourceEpoch as preSilentPotionEpoch} from './pre-silent-potion-source-epoch.mjs';
import {extendSilentPotionEpoch} from '../silent-potion-source-epoch.mjs';
export {preSilentPotionEpoch};
// Every projection freshly authenticates all 52 changed raw owners.
export const sourceEpoch=extendSilentPotionEpoch(preSilentPotionEpoch);
