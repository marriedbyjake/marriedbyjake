import {readPublishingState,retryPublishing} from './ledger.mjs';
import {snapshotSql,sha256} from '../../scripts/lib/published-content.mjs';
export const statusMessages = {
 disabled:'Automatic publishing is paused. Saving or publishing in EmDash will not update the public site yet.',
 uninitialized:'Publishing needs an owner-approved setup before releases can go live.',
 pending:'Saved in EmDash. A website release is waiting for the next publishing check.',
 preparing:'Saved in EmDash. Preparing the website release.',
 'awaiting-build':'Saved in EmDash. The website is building; the last healthy release remains available.',
 retrying:'Publishing failed and will retry automatically. The last healthy website remains available.',
 paused:'Publishing needs attention. The last healthy website remains available. Review the failure before retrying.',
 healthy:'The published CMS content matches the Git snapshot.',
};
export async function publishingStatus(env) {
 if(env.PUBLISHING_ENABLED!=='true')return {phase:'disabled',message:statusMessages.disabled,canRetry:false};
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 const state=await readPublishingState(db);
 let phase=state.phase;
 if(phase==='healthy'){
  const row=await db.prepare(snapshotSql({fingerprint:true})).first();
  if(!row?.snapshot || sha256(row.snapshot)!==state.sourceFingerprint)phase='pending';
 }
 if(!Object.hasOwn(statusMessages,phase))phase='uninitialized';
 return {phase,message:statusMessages[phase],canRetry:phase==='paused'||phase==='retrying',retryAt:state.retryAt||null,
  lastHealthyAt:state.lastHealthyAt||null,confirmedCommit:state.confirmedCommit||null,
  pendingCommit:state.pending?.commit||null,
  // Known conflict/setup messages contain no credentials. Unexpected upstream
  // errors never enter the ledger; do not return jobs, tokens, caches or drafts.
  reason:state.reason||null};
}
export async function retryFromEditor(request,env,editor) {
 if(!editor)return new Response('Sign in as an editor',{status:403});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return new Response('Same-origin request required',{status:403});
 if(env.PUBLISHING_ENABLED!=='true')return new Response('Publishing is disabled',{status:409});
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 const state=await readPublishingState(db);
 if(!['paused','retrying'].includes(state.phase))return new Response('No failed attempt to retry',{status:409});
 return new Response(null,{status:await retryPublishing(db)?303:409,headers:{Location:'/_publishing'}});
}
