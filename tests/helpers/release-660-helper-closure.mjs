// Exact outer helper closure. Historical archives and their hashes stay immutable.
import assert from 'node:assert/strict';
const patch={
  "tests/helpers/closeout-source-epoch.mjs": {
    "before": "552e5980a76b46fcd030fcafe516d5b7673021dce0a7b0c23072bfb67dcf1e40",
    "after": "9cfaae893a00e4ce76eb38b7199290ea53c1aa8662b4e9315eda7e3d992b12f7"
  },
  "tests/helpers/release-660-source-epoch.mjs": {
    "before": null,
    "after": "07c35997ceb7b07b865fb2103c5fe6403b22ec833ab59826b6f0ad52510c8421"
  },
  "tests/helpers/release-660-source-epoch.json.gz": {
    "before": null,
    "after": "7d1fb1fdf78a68f8e78cea8b5918e80d8f2aab6e0d78499e324281499a3606fc"
  }
};
export function extendRelease660HelperClosure(original){
 const current={...original};
 for(const [path,row]of Object.entries(patch)){
  assert.equal(original[path]??null,row.before,'exact release660 helper predecessor: '+path);
  current[path]=row.after;
 }
 return Object.freeze(current);
}
