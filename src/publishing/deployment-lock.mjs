import {timingSafeEqual} from 'node:crypto';
import {claimPublishingLease} from './ledger.mjs';
const option='marriedbyjake:deployment';
const headers={'Cache-Control':'private, no-store','X-Robots-Tag':'noindex'};
// A dedicated CI secret can operate this one lease only. It grants no content,
// media, admin or Cloudflare API access. Builds need no D1 API credential.
export async function deploymentLock(request,env){
 const secret=env.PUBLISHING_BUILD_SECRET;
 if(!secret)return new Response('Deployment gate is disabled',{status:503,headers});
 const actual=new TextEncoder().encode(request.headers.get('Authorization')||'');
 const expected=new TextEncoder().encode(`Bearer ${secret}`);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return new Response('Unauthorized',{status:401,headers});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405,headers});
 const reader=request.body?.getReader();let length=0;const chunks=[];
 if(reader)while(true){const result=await reader.read();if(result.done)break;length+=result.value.byteLength;if(length>2048){await reader.cancel();return new Response('Request too large',{status:413,headers});}chunks.push(result.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return new Response('Invalid request',{status:400,headers});}
 if(!/^[a-f0-9]{40}$/.test(body.commit||''))return new Response('Invalid commit',{status:400,headers});
 const db=env.DB.withSession?env.DB.withSession('first-primary'):env.DB;
 if(body.action==='claim'){
  const lease=await claimPublishingLease(db,Date.now(),option);
  if(!lease)return new Response('Another build is deploying',{status:409,headers});
  try{const state=await lease.save({...lease.state,phase:'deploying',commit:body.commit});return Response.json({leaseId:state.leaseId},{headers});}
  catch(error){await lease.release();throw error;}
 }
 if(!/^[a-f0-9-]{36}$/.test(body.leaseId||''))return new Response('Invalid lease',{status:400,headers});
 if(!['renew','release'].includes(body.action))return new Response('Invalid action',{status:400,headers});
 const sql=body.action==='renew'
  ? "UPDATE options SET value=json_set(value,'$.leaseUntil',?),revision=revision+1 WHERE name=? AND json_extract(value,'$.leaseId')=? AND json_extract(value,'$.commit')=? AND json_extract(value,'$.leaseUntil')>? RETURNING name"
  : "UPDATE options SET value=json_remove(value,'$.leaseId','$.leaseUntil'),revision=revision+1 WHERE name=? AND json_extract(value,'$.leaseId')=? AND json_extract(value,'$.commit')=? AND json_extract(value,'$.leaseUntil')>? RETURNING name";
 const params=[option,body.leaseId,body.commit,Date.now()];if(body.action==='renew')params.unshift(Date.now()+300_000);
 const row=await db.prepare(sql).bind(...params).first();
 return new Response(null,{status:row?204:409,headers});
}
