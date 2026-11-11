// Candidate-only four-band deformation; geometry/color arrays remain byte-identical.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const [source,output]=process.argv.slice(2);assert(source&&output&&!fs.existsSync(output));
const bytes=fs.readFileSync(source),data=JSON.parse(bytes),before=JSON.stringify(data.rows);
assert.equal(data.width,210);assert.equal(data.height,192);assert.equal(data.bands.length,18);
const bounds=[0,50,100,161,192];
data.bandByRow=data.rows.map((row,index)=>{
 const top=data.height/2-row[2]-row[4]/2,bottom=top+row[4];
 const originalCenter=data.bands[data.bandByRow[index]-1]/585*data.height;
 const band=bounds.findIndex((y,i)=>i<4&&originalCenter>=y&&originalCenter<bounds[i+1]);
 // The original 7303 export adds .08px total vertical seam overlap.
 // Keep those exact rows; tolerate only their existing .04px on either side.
 assert(band>=0&&top>=bounds[band]-.041&&bottom<=bounds[band+1]+.041,'a rectangle crosses a new motion boundary');return band+1;
});
data.bands=bounds.slice(0,-1).map((y,i)=>(y+bounds[i+1])/2/data.height*585);
data.samplesPerCycle=20;
assert.equal(JSON.stringify(data.rows),before);
fs.writeFileSync(output,JSON.stringify(data));
fs.writeFileSync(output+'.receipt.json',JSON.stringify({
 source,sourceSha256:createHash('sha256').update(bytes).digest('hex'),
 output,outputSha256:createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
 images:data.count,bands:4,samplesPerCycle:20,geometryAndColorsUnchanged:true,seamOverlapTolerancePixels:.041,
 scope:'same approved field sampled by four cached parents; coarser spatial approximation, not frame-exact GIF'
},null,2)+'\n');
