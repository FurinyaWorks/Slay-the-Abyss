import subprocess,hashlib,json,gzip,pathlib
r=pathlib.Path('/workspace/scratch/c1a4970a76e0/m7-stasis-owner');base='4a51905537fa223e5df4e5ee475152c8a6629af5';paths=['config/architecture.json','src/lua/abyss_actor.lua','src/lua/abyss_act2_powers.lua','src/lua/abyss_act2_stasis.lua']
def binding(b):
 s=b.decode().replace('\r\n','\n'); n=s.encode();return {'source':s,'sha256':hashlib.sha256(n).hexdigest(),'gitBlob':hashlib.sha1(b'blob '+str(len(n)).encode()+b'\0'+n).hexdigest(),'rawGitBlob':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest(),'mode':'100644'}
x={'schemaVersion':1,'normalization':'LF','currentCommit':base,'currentCommitRole':'Collected base only; current source is an uncommitted authenticated slice.','owners':paths,'current':{p:binding((r/p).read_bytes()) for p in paths},'targets':{'prior':{'commit':base,'files':{p:binding(subprocess.check_output(['git','show',base+':'+p],cwd=r)) for p in paths}}}}
prior=json.load(open('/tmp/stasis-prior-proof.json'))
for p in paths:
 assert x['targets']['prior']['files'][p]['source']==prior['current'][p]['source']
 x['targets']['prior']['files'][p]=prior['current'][p]
b=(json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode();z=gzip.compress(b,mtime=0);(r/'tests/helpers/stasis-source-epoch.json.gz').write_bytes(z)
s=(r/'tests/helpers/encounter-formation-source-epoch.mjs').read_text().replace('encounter-formation','stasis').replace('encounterFormation','stasis').replace('EncounterFormation','Stasis');s=s.replace('6d082e4f921213a60a41ab1f0a4109a49645c1014cc83f315178937ca0885132',hashlib.sha256(z).hexdigest()).replace('95c3f768a7ea3461227f531e7feb5e48d8a9201606f9685e1a3afe8bd226255b',hashlib.sha256(b).hexdigest());(r/'tests/helpers/stasis-source-epoch.mjs').write_text(s)
(r/'tests/helpers/combined-epoch/source-epoch.mjs').write_text("// Preserve the complete Formation predecessor as an independently importable epoch.\nexport * from './pre-stasis-source-epoch.mjs';\nimport {sourceEpoch as preStasisEpoch} from './pre-stasis-source-epoch.mjs';\nimport {extendStasisEpoch} from '../stasis-source-epoch.mjs';\nexport {preStasisEpoch};\n// Current public consumers authenticate all 53 changed raw owners on every call.\nexport const sourceEpoch=extendStasisEpoch(preStasisEpoch);\n")
