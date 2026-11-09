// Preserve the complete Formation predecessor as an independently importable epoch.
export * from './pre-stasis-source-epoch.mjs';
import {sourceEpoch as preStasisEpoch} from './pre-stasis-source-epoch.mjs';
import {extendStasisEpoch} from '../stasis-source-epoch.mjs';
export {preStasisEpoch};
// Current public consumers authenticate all 53 changed raw owners on every call.
export const sourceEpoch=extendStasisEpoch(preStasisEpoch);
