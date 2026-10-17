import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export async function wranglerReleaseTools({config,workerName,commit}) {
 // Preserve Cloudflare's structured output channel so Builds can associate
 // the exact uploaded/deployed version with its source commit in the UI.
 const receipt=process.env.WRANGLER_OUTPUT_FILE_PATH||path.resolve(`.emdash/version-upload-${randomUUID()}.jsonl`);
 await fs.mkdir(path.dirname(receipt),{recursive:true});
 await fs.appendFile(receipt,'',{mode:0o600});
 const run=(args,{signal,capture=false}={})=>new Promise((resolve,reject)=>{
  let output='';
  const child=spawn('npx',['wrangler',...args,'--config',config],{env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_OUTPUT_FILE_PATH:receipt},stdio:['ignore',capture?'pipe':'inherit','inherit'],signal,timeout:240_000});
  if(capture)child.stdout.on('data',chunk=>{output+=chunk;if(output.length>2_000_000)child.kill();});
  child.on('error',reject);child.on('exit',code=>code===0?resolve(output):reject(Error('Worker version operation failed; inspect the build log')));
 });
 return {
  active:async()=>{
   const deployments=JSON.parse(await run(['deployments','list','--json'],{capture:true}));
   const newest=deployments.sort((a,b)=>b.created_on.localeCompare(a.created_on))[0];
   if(!newest)throw Error('Bootstrap and verify the isolated Worker before enabling Builds');
   return newest.versions;
  },
  upload:async signal=>{
   await run(['versions','upload','--keep-vars','--message',`main ${commit}: ${workerName}`],{signal});
   const rows=(await fs.readFile(receipt,'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
   const upload=rows.filter(row=>row.type==='version-upload'&&row.worker_name===workerName).at(-1);
   if(!upload?.version_id)throw Error('Upload receipt differs from the reviewed Worker');
   if(workerName==='marriedbyjake-public'&&upload.bundle_size?.raw_bytes>32768)throw Error('Uploaded public script exceeds 32 KiB');
   return upload.version_id;
  },
  activate:(version,signal)=>run(['versions','deploy',`${version}@100`,'--yes','--message',`main ${commit}: verified ${workerName}`],{signal}),
 };
}
