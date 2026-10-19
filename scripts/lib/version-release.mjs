// Upload and activation are separate so failed, superseded or unverified
// uploads never replace traffic. Route/cron ownership is not mutated here.
export async function releaseVersion({commit,head,upload,activate,active,healthy,assertLease=async()=>{},signal}) {
 const previous=await active();
 if(previous.length!==1||previous[0].percentage!==100)throw Error('Expected one healthy active version; inspect traffic before releasing');
 const version=await upload(signal);
 if(!/^[a-f0-9-]{36}$/.test(version))throw Error('Missing exact uploaded version receipt');
 await assertLease();
 if(await head()!==commit)throw Error('Stale build: main advanced during upload');
 try{
  await activate(version,signal);
  await assertLease();
  const current=await active();
  if(current.length!==1||current[0].version_id!==version||current[0].percentage!==100)throw Error('Uploaded version does not own all traffic');
  await healthy();
  return version;
 }catch(error){
  // Activation can succeed even if its response is lost. Restore the recorded
  // previous code/assets on any uncertain activation or failed live check.
  await assertLease();
  await activate(previous[0].version_id);
  const restored=await active();
  if(restored.length!==1||restored[0].version_id!==previous[0].version_id||restored[0].percentage!==100)throw Error('Rollback verification failed; inspect active traffic immediately',{cause:error});
  throw error;
 }
}

export async function awaitBackendRelease({expected,read,head,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=900_000}) {
 const end=now()+timeoutMs;
 while(now()<end){
  if(await head()!==expected.sourceCommit)throw Error('Stale public build: main advanced while waiting for CMS');
  const actual=await read().catch(()=>null);
  if(actual?.sourceCommit===expected.sourceCommit&&actual?.contentHash===expected.contentHash)return;
  await wait(10_000);
 }
 throw Error('Matching CMS release was not healthy in time; existing public version retained');
}

// Traffic control can acknowledge activation before every request sees it.
// Keep exact identity checks, the lease and source fence throughout a short,
// bounded propagation window; the caller rolls back if it never converges.
export async function awaitLiveRelease({expected,read,assertCurrent,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=60_000}) {
 const end=now()+timeoutMs;
 while(true){
  await assertCurrent();
  const actual=await read().catch(()=>null);
  if(actual?.sourceCommit===expected.sourceCommit&&actual?.contentHash===expected.contentHash)return;
  if(now()>=end)throw Error('Live release identity did not converge before the deadline');
  await wait(Math.min(3_000,end-now()));
 }
}

export async function claimDeployment({claim,commit,head,now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=180_000}) {
 const end=now()+timeoutMs;
 while(true){
  if(await head()!==commit)throw Error('Stale build: main advanced while waiting for the deployment lease');
  try{return await claim();}catch(error){
   if(error.status!==409||now()>=end)throw error;
   await wait(5_000);
  }
 }
}
