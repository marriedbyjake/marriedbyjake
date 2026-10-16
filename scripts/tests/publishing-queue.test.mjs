import test from 'node:test';
import assert from 'node:assert/strict';
import {advancePublication,failedPublication,PublicationConflict,PublicationPaused} from '../lib/publishing-queue.mjs';
const initial=()=>({baselineHash:'old',phase:'healthy'});
function dependencies() {
 const calls=[];
 return {calls, live:async()=>({}),remote:async()=>{calls.push('remote');return {contentHash:'old',commit:'source-base'};},prepare:async()=>{calls.push('prepare');return {contentHash:'new'};},stillCurrent:async()=>{calls.push('fence');return true;},commitAndPush:async(_,base)=>{calls.push('push');assert.equal(base,'source-base');return 'new-commit';}};
}
test('publication is fenced before Git and held until the exact commit is live',async()=>{
 const deps=dependencies();const pushed=await advancePublication(initial(),deps,100);
 assert.deepEqual(deps.calls,['remote','prepare','fence','push']);assert.equal(pushed.pending.commit,'new-commit');
 deps.calls.length=0;const pending=await advancePublication(pushed,deps,200);assert.equal(pending.phase,'awaiting-build');assert.deepEqual(deps.calls,[]);
 deps.live=async()=>({contentHash:'new',sourceCommit:'wrong-commit'});assert.equal((await advancePublication(pending,deps,300)).phase,'awaiting-build');
 deps.live=async()=>({contentHash:'new',sourceCommit:'new-commit'});const healthy=await advancePublication(pending,deps,400);assert.equal(healthy.phase,'healthy');assert.equal(healthy.pending,undefined);
});
test('independent Git content edits halt without exporting or pushing',async()=>{
 const deps=dependencies();deps.remote=async()=>({contentHash:'human-edit'});
 await assert.rejects(advancePublication(initial(),deps),PublicationConflict);assert.deepEqual(deps.calls,[]);
});
test('a concurrent CMS/media edit aborts the commit',async()=>{
 const deps=dependencies();deps.stillCurrent=async()=>false;
 await assert.rejects(advancePublication(initial(),deps),/changed during export/);assert.ok(!deps.calls.includes('push'));
});
test('a rejected Git push does not advance the baseline',async()=>{
 const deps=dependencies();deps.commitAndPush=async()=>{throw new PublicationConflict('Remote changed');};const state=initial();
 await assert.rejects(advancePublication(state,deps),PublicationConflict);assert.equal(state.baselineHash,'old');
});
test('unchanged published content does not commit drafts or metadata-only saves',async()=>{
 const deps=dependencies();deps.prepare=async()=>({contentHash:'old'});
 assert.equal((await advancePublication(initial(),deps)).phase,'healthy');assert.ok(!deps.calls.includes('push'));
});
test('transient failures back off, then pause after three retries',async()=>{
 let state=initial();for(const delay of [60_000,120_000,240_000]){state=failedPublication(state,new Error('network'),100);assert.equal(state.retryAt,100+delay);}
 state=failedPublication(state,new Error('network'),100);assert.equal(state.phase,'paused');
 await assert.rejects(advancePublication(state,dependencies()),PublicationPaused);
 const waiting=await advancePublication({...initial(),retryAt:500},dependencies(),100);assert.equal(waiting.retryAt,500);
});
test('a stalled build pauses without another Git release or deployment',async()=>{
 const state={...initial(),pending:{commit:'pending',contentHash:'new',pushedAt:0}};
 await assert.rejects(advancePublication(state,dependencies(),31*60_000),PublicationPaused);
});
test('uninitialized queue fails closed',async()=>{
 await assert.rejects(advancePublication({},dependencies()),PublicationPaused);
});
