// Preserve the complete Stasis predecessor as an independently importable epoch.
export * from './pre-wheel-source-epoch.mjs';
import {sourceEpoch as preWheelEpoch} from './pre-wheel-source-epoch.mjs';
import {extendWheelEventEpoch} from '../wheel-event-source-epoch.mjs';
export {preWheelEpoch};
// Current public consumers authenticate all 54 changed raw owners on every call.
export const sourceEpoch=extendWheelEventEpoch(preWheelEpoch);
