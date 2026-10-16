import {claimPublishingLease} from '../../src/publishing/ledger.mjs';
// Separate row in the same private options table. Every production deploy must
// use this gate: a slow old build cannot finish after a newer guarded deploy.
export async function guardedDeployment({db,commit,head,deploy,claim}) {
 const lease=await (claim ? claim() : claimPublishingLease(db,Date.now(),'marriedbyjake:deployment'));
 if(!lease)throw Error('Another deployment holds the release lock; retry this build later');
 const controller=new AbortController();
 let renewal;
 try{
  await lease.save({...lease.state,phase:'deploying',commit});
  if(await head()!==commit)throw Error('Stale build: main advanced before deployment');
  await lease.assert();
  renewal=setInterval(()=>{void lease.save({...lease.state,phase:'deploying',commit}).catch(()=>controller.abort());},30_000);
  await deploy(controller.signal);
  await lease.assert();
  await lease.save({...lease.state,phase:'deployed',commit});
 }finally{clearInterval(renewal);await lease.release();}
}
