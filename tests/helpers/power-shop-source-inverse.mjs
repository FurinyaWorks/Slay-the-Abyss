// Proposal facade: the original epoch module and its oracle are byte-for-byte frozen.
export * from './epochs/powerShop/tests/helpers/power-shop-source-inverse.mjs';
import { prePowerShopSource as original } from './epochs/powerShop/tests/helpers/power-shop-source-inverse.mjs';
import {sourceEpoch} from './combined-epoch/source-epoch.mjs';
import {readFileSync} from 'node:fs';
const live=p=>readFileSync(p,'utf8');
export function prePowerShopSource(path,source,{readSource=live}={}){
 const projected=sourceEpoch.preCombinedSource(path,source,{target:'powerShop',readSource});
 return original(path,projected,{readSource:sourceEpoch.combinedReader(readSource,'powerShop')});
}
