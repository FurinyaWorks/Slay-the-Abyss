// The frozen predecessor remains independently importable by historical contracts.
export * from './pre-defect-source-epoch.mjs';
import {sourceEpoch as preDefectFinalEpoch} from './pre-defect-source-epoch.mjs';
import {extendDefectFinalEpoch} from '../defect-final-source-epoch.mjs';
export {preDefectFinalEpoch};
// Current public consumers authenticate all 50 changed raw owners on every call.
export const sourceEpoch=extendDefectFinalEpoch(preDefectFinalEpoch);
