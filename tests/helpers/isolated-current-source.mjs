// Detached source tests must copy the entry point's authenticated dependency
// closure and read owners from their own filesystem, never from the live tree.
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {copyIntegrationSourceClosure} from './copy-integration-source-closure.mjs';

export function copyCurrentSourceFixture(directory,{crlf=false}={}){
 copyIntegrationSourceClosure(directory);
 const text=source=>crlf?source.replaceAll('\r\n','\n').replaceAll('\n','\r\n'):source;
 const paths=['config/architecture.json',...readdirSync('src/lua').filter(name=>name.endsWith('.lua')).map(name=>'src/lua/'+name)];
 for(const path of paths){
  mkdirSync(dirname(join(directory,path)),{recursive:true});
  writeFileSync(join(directory,path),text(readFileSync(path,'utf8')));
 }
 if(crlf){
  for(const entry of readdirSync(join(directory,'tests/helpers'),{recursive:true,withFileTypes:true})){
   if(entry.isFile()&&/\.(?:mjs|lua)$/.test(entry.name)){
    const path=join(entry.parentPath,entry.name);
    writeFileSync(path,text(readFileSync(path,'utf8')));
   }
  }
 }
 return path=>readFileSync(join(directory,path),'utf8');
}
