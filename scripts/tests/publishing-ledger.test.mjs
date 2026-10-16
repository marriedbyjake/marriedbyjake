import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {claimPublishingLease,readPublishingState,retryPublishing,LeaseLost,publishingOption} from '../../src/publishing/ledger.mjs';
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE options(name TEXT PRIMARY KEY,value TEXT,revision INTEGER NOT NULL DEFAULT 0)');
 return {sqlite,prepare(sql){return {bind(...args){return {first:async()=>sqlite.prepare(sql).get(...args)||null,run:async()=>sqlite.prepare(sql).run(...args)};}};}};
}
test('D1-compatible SQLite lease serializes claims and persists state before release',async()=>{
 const db=database();try{
  const [first,second]=await Promise.all([claimPublishingLease(db),claimPublishingLease(db)]);assert.ok(first);assert.equal(second,undefined);
  await first.save({...first.state,phase:'preparing',baselineHash:'a'.repeat(64)});await first.release();
  assert.equal((await readPublishingState(db)).phase,'preparing');const next=await claimPublishingLease(db);assert.ok(next);await next.release();
 }finally{db.sqlite.close();}
});
test('expired leases cannot write or release a newer claim',async()=>{
 const db=database();try{
  const old=await claimPublishingLease(db);db.sqlite.prepare("UPDATE options SET value=json_set(value,'$.leaseUntil',0)").run();
  const current=await claimPublishingLease(db);await assert.rejects(old.save({...old.state,phase:'healthy'}),LeaseLost);await assert.rejects(old.assert(),LeaseLost);
  await old.release();await current.assert();await current.release();
 }finally{db.sqlite.close();}
});
test('retry retains uncertain commit intent and refuses an active lease',async()=>{
 const db=database();try{
  const lease=await claimPublishingLease(db);await lease.save({...lease.state,phase:'paused',baselineHash:'hash',job:{commit:'pending-commit'},failures:4,reason:'failure'});
  assert.equal(await retryPublishing(db),false);await lease.release();assert.equal(await retryPublishing(db),true);
  const state=await readPublishingState(db);assert.equal(state.job.commit,'pending-commit');assert.equal(state.phase,'preparing');assert.equal(state.reason,undefined);assert.equal(state.failures,0);
 }finally{db.sqlite.close();}
});
