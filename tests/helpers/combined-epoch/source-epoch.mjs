// Preserve the complete predecessor and all historical source identities.
export * from './pre-flow-preparation-source-epoch.mjs';
import {sourceEpoch as preWatcherFlowPreparationEpoch} from './pre-flow-preparation-source-epoch.mjs';
import {extendWatcherFlowPreparationEpoch} from '../watcher-flow-preparation-source-epoch.mjs';
export {preWatcherFlowPreparationEpoch};
// Every projection freshly authenticates all 51 complete current owners.
export const sourceEpoch=extendWatcherFlowPreparationEpoch(preWatcherFlowPreparationEpoch);
