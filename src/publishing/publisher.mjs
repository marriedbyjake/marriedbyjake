import {Buffer} from 'node:buffer';
import {digest,sha256,snapshotSql,projectPublished,verifyMedia,releaseFiles} from '../../scripts/lib/published-content.mjs';
import {failedPublication,PublicationConflict,PublicationPaused} from '../../scripts/lib/publishing-queue.mjs';
import {claimPublishingLease,LeaseLost} from './ledger.mjs';
import {GitHubPublisher,gitBlobHash} from './github.mjs';
class YieldPublication extends Error {}
const cacheKey=row=>sha256(`${row.content_hash}:${row.size}`);
const pathsHash=paths=>digest(paths);
export async function runPublisher(env,dependencies={}){
 if(env.PUBLISHING_ENABLED!=='true')return {phase:'disabled'};
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 const lease=await claimPublishingLease(db);if(!lease)return {phase:'busy'};
 let state=lease.state;
 const save=async next=>(state=await lease.save(next));
 const client=dependencies.client||new GitHubPublisher(env,dependencies.fetcher||fetch,lease.assert);
 const fingerprint=async()=>{
  const result=await db.prepare(snapshotSql({fingerprint:true})).first();
  if(typeof result?.snapshot!=='string')throw Error('Incomplete CMS fingerprint');return sha256(result.snapshot);
 };
 try{
  if(state.phase==='paused'||(state.retryAt&&Date.now()<state.retryAt))return {phase:state.phase};
  if(!state.baselineHash){
   if(!/^[a-f0-9]{64}$/.test(env.PUBLISHING_BASELINE_HASH||''))throw new PublicationPaused('A reviewed Git baseline is required before publishing can start');
   const base=await client.remote();
   if(base.manifest.contentHash!==env.PUBLISHING_BASELINE_HASH)throw new PublicationConflict('Reviewed Git baseline differs from main');
   const cache={};
   for(const item of Object.values(base.media.items)){
    const blob=base.paths[`src/images/published/${item.asset}`];
    if(!blob||!item.size||!item.sourceHash||!/^[a-f0-9]{64}$/.test(item.sha256))throw new PublicationPaused('The reviewed Git baseline has incomplete image metadata');
    cache[cacheKey({content_hash:item.sourceHash,size:item.size})]={hash:item.sha256,blob,sourceHash:item.sourceHash,size:item.size};
   }
   await save({...state,baselineHash:base.manifest.contentHash,baselinePathsHash:pathsHash(base.paths),cache,phase:'healthy',failures:0});
   return {phase:'initialized'};
  }
  if(state.pending){
   const response=await (dependencies.fetcher||fetch)('https://marriedbyjake.com/release.json',{cache:'no-store',signal:AbortSignal.timeout(10_000)});
   if(!response.ok)throw Error('Live release status is unavailable');const live=await response.json();
   if(live.contentHash===state.pending.contentHash&&live.sourceCommit===state.pending.commit){
    await save({...state,phase:'healthy',pending:undefined,failures:0,retryAt:undefined,reason:undefined,lastHealthyAt:Date.now()});return {phase:'healthy'};
   }
   if(Date.now()-state.pending.pushedAt>30*60_000)throw new PublicationPaused('Git release has not become live within 30 minutes; inspect Cloudflare Builds');
   await save({...state,phase:'awaiting-build'});return {phase:'awaiting-build'};
  }
  const current=await fingerprint();
  if(state.job&&state.job.fingerprint!==current){
   await save({...state,phase:'healthy',job:undefined,failures:0,reason:undefined});return {phase:'cms-changed'};
  }
  if(!state.job){
   if(state.sourceFingerprint===current)return {phase:'healthy'};
   const base=await client.remote();
   if(base.manifest.contentHash!==state.baselineHash||pathsHash(base.paths)!==state.baselinePathsHash)throw new PublicationConflict('Published Git files changed independently; reconcile before resuming');
   await save({...state,phase:'preparing',job:{fingerprint:current,base:{head:base.head,tree:base.tree,nodeId:base.nodeId,paths:base.paths},files:{}}});
  }
  if(state.job.commit){
   // Commit intent was persisted before this update. Recover accepted updates
   // after a crash without creating a duplicate or overwriting another head.
   const head=await client.head();
   if(head!==state.job.commit){
    if(head!==state.job.base.head)throw new PublicationConflict('Git main advanced during publication');
    await lease.assert();await client.update(state.job.base,state.job.commit);
   }
   await save({...state,phase:'awaiting-build',baselineHash:state.job.contentHash,baselinePathsHash:state.job.pathsHash,sourceFingerprint:state.job.fingerprint,
    pending:{commit:state.job.commit,contentHash:state.job.contentHash,pushedAt:Date.now()},job:undefined,failures:0,retryAt:undefined,reason:undefined});
   return {phase:'awaiting-build'};
  }
  const raw=await db.prepare(snapshotSql()).first();if(typeof raw?.snapshot!=='string')throw Error('Incomplete published CMS snapshot');
  let uploaded=0;
  const projected=await projectPublished(JSON.parse(raw.snapshot),undefined,{retainAssets:false,resolveMedia:async row=>{
   const key=cacheKey(row);const cached=state.cache[key];
   if(cached&&cached.sourceHash===row.content_hash&&cached.size===row.size&&/^[a-f0-9]{40}$/.test(cached.blob))return {hash:cached.hash};
   if(uploaded>=2)throw new YieldPublication();
   if(row.size>8*1024*1024)throw new PublicationPaused('A published image exceeds the reviewed 8 MiB limit');
   const object=await env.MEDIA.get(row.storage_key);if(!object||object.size!==row.size)throw Error('Published media changed during export');
   const bytes=Buffer.from(await object.arrayBuffer());const hash=verifyMedia(bytes,row.content_hash,row.size);
   const blob=await client.upload(bytes);uploaded++;
   await save({...state,cache:{...state.cache,[key]:{hash,blob,sourceHash:row.content_hash,size:row.size}}});return {hash};
  }});
  if(await fingerprint()!==current)throw Error('CMS changed during export; preparing a fresh release');
  if(projected.contentHash===state.baselineHash){await save({...state,phase:'healthy',sourceFingerprint:current,job:undefined,failures:0,retryAt:undefined});return {phase:'healthy'};}
  const paths={};const {files}=releaseFiles(projected);
  let metadataUploads=0;
  for(const [name,body] of Object.entries(files)){
   const file=`content/published/${name}`;const bytes=Buffer.from(body);const hash=gitBlobHash(bytes);
   if(state.job.base.paths[file]===hash||state.job.files[file]===hash)paths[file]=hash;
   else {if(metadataUploads>=4)throw new YieldPublication();paths[file]=await client.upload(bytes);metadataUploads++;}
   if(state.job.files[file]!==paths[file])await save({...state,job:{...state.job,files:{...state.job.files,[file]:paths[file]}}});
  }
  for(const item of Object.values(projected.release.media))paths[`src/images/published/${item.asset}`]=state.cache[cacheKey({content_hash:item.sourceHash,size:item.size})].blob;
  if(await fingerprint()!==current)throw Error('CMS changed before the Git commit');
  const commit=await client.commit(state.job.base,paths,projected.contentHash);
  await save({...state,phase:'preparing',job:{...state.job,commit,contentHash:projected.contentHash,pathsHash:pathsHash(paths)}});
  return {phase:'commit-prepared'};
 }catch(error){
  if(error instanceof LeaseLost)return {phase:'lease-replaced'};
  if(error instanceof YieldPublication)return {phase:'preparing'};
  await save(failedPublication(state,error));return {phase:state.phase};
 }finally{await lease.release();}
}
