// Preserve the complete Formation predecessor without rewriting historical sources.
export * from './pre-run-healing-source-epoch.mjs';
import {sourceEpoch as preRunHealingEpoch} from './pre-run-healing-source-epoch.mjs';
import {extendRunHealingEpoch} from '../run-healing-source-epoch.mjs';
export {preRunHealingEpoch};
// Every current projection freshly authenticates all 54 changed raw owners.
export const sourceEpoch=extendRunHealingEpoch(preRunHealingEpoch);
