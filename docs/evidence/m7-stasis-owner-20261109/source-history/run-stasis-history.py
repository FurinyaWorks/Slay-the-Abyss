import pathlib,hashlib,json,subprocess,time,sys
r=pathlib.Path('/workspace/scratch/c1a4970a76e0/m7-stasis-owner'); name=sys.argv[1];args=sys.argv[2:];out=r/'build/stasis-history';out.mkdir(exist_ok=True)
def inputs():
 paths=['package.json','package-lock.json']
 for directory in ['src/lua','scripts','tests/helpers','tests/fixtures','tests/lua','config','build/lua']:
  paths.extend(str(p.relative_to(r)) for p in (r/directory).rglob('*') if p.is_file())
 paths.extend(str(p.relative_to(r)) for p in (r/'tests').glob('*.test.mjs'))
 return {p:hashlib.sha256((r/p).read_bytes()).hexdigest() for p in sorted(set(paths))}
before=inputs();start=time.time();cmd=['node','--test']+args
with open(out/(name+'.log'),'w')as log:result=subprocess.run(cmd,cwd=r,stdout=log,stderr=subprocess.STDOUT)
after=inputs();receipt={'command':cmd,'baseCommit':'4a51905537fa223e5df4e5ee475152c8a6629af5','exitCode':result.returncode,'durationMs':int((time.time()-start)*1000),'inputSha256':before,'afterInputSha256':after,'changedInputs':[p for p in before if before[p]!=after.get(p)],'logSha256':hashlib.sha256((out/(name+'.log')).read_bytes()).hexdigest()};(out/(name+'-receipt.json')).write_text(json.dumps(receipt,indent=2)+'\n');print(name,result.returncode,receipt['durationMs'],receipt['changedInputs'])
