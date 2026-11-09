// Authenticate the complete live three-file slice before supplying old contracts.
import {readFileSync} from 'node:fs';
import {silentPotionEpoch} from './silent-potion-source-epoch.mjs';
const raw=path=>readFileSync(path,'utf8');
export const readSilentPotionPrior=silentPotionEpoch.combinedReader(raw,'prior');
