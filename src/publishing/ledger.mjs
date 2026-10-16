import {json} from '../../scripts/lib/published-content.mjs';
export const publishingOption='marriedbyjake:publishing';
export class LeaseLost extends Error {}
export async function readPublishingState(db){
 const row=await db.prepare('SELECT value FROM options WHERE name = ?').bind(publishingOption).first();
 return row?JSON.parse(row.value):{phase:'uninitialized'};
}
export async function claimPublishingLease(db,now=Date.now()){
 await db.prepare('INSERT INTO options(name,value,revision) VALUES(?,?,0) ON CONFLICT(name) DO NOTHING').bind(publishingOption,json({formatVersion:1,phase:'uninitialized',cache:{}})).run();
 const id=crypto.randomUUID();
 const row=await db.prepare("UPDATE options SET value=json_set(value,'$.leaseId',?,'$.leaseUntil',?),revision=revision+1 WHERE name=? AND COALESCE(json_extract(value,'$.leaseUntil'),0)<=? RETURNING value")
  .bind(id,now+300_000,publishingOption,now).first();
 if(!row)return;
 let state=JSON.parse(row.value);
 const assert=async()=>{
  const held=await db.prepare("SELECT 1 AS held FROM options WHERE name=? AND json_extract(value,'$.leaseId')=? AND json_extract(value,'$.leaseUntil')>?").bind(publishingOption,id,Date.now()).first();
  if(!held)throw new LeaseLost('Publishing lease was replaced');
 };
 const save=async next=>{
  const updated=await db.prepare("UPDATE options SET value=?,revision=revision+1 WHERE name=? AND json_extract(value,'$.leaseId')=? AND json_extract(value,'$.leaseUntil')>? RETURNING value")
   .bind(json({...next,leaseId:id,leaseUntil:Date.now()+300_000}),publishingOption,id,Date.now()).first();
  if(!updated)throw new LeaseLost('Publishing lease was replaced');state=JSON.parse(updated.value);return state;
 };
 return {state,assert,save,release:async()=>{
  await db.prepare("UPDATE options SET value=json_remove(value,'$.leaseId','$.leaseUntil'),revision=revision+1 WHERE name=? AND json_extract(value,'$.leaseId')=?").bind(publishingOption,id).run();
 }};
}
export async function retryPublishing(db,now=Date.now()){
 // Preserve pending commit intent so an uncertain accepted push is recovered.
 const row=await db.prepare("UPDATE options SET value=json_set(json_remove(value,'$.reason','$.retryAt'),'$.failures',0,'$.phase',CASE WHEN json_extract(value,'$.pending') IS NOT NULL THEN 'awaiting-build' WHEN json_extract(value,'$.job') IS NOT NULL THEN 'preparing' ELSE 'healthy' END),revision=revision+1 WHERE name=? AND COALESCE(json_extract(value,'$.leaseUntil'),0)<=? AND json_extract(value,'$.baselineHash') IS NOT NULL RETURNING value").bind(publishingOption,now).first();
 return !!row;
}
