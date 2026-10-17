import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseVersion,awaitBackendRelease,claimDeployment} from '../lib/version-release.mjs';
const old='11111111-1111-4111-8111-111111111111',next='22222222-2222-4222-8222-222222222222';
function fixture(patch={}){
 let current=old;const events=[];
 const methods={commit:'exact',head:async()=>'exact',active:async()=>[{version_id:current,percentage:100}],upload:async()=>{events.push('upload');return next;},activate:async version=>{events.push(version);current=version;},healthy:async()=>events.push('healthy'),...patch};
 return {methods,events,current:()=>current};
}
test('uploads do not change traffic; failed upload and superseded source retain the healthy version',async()=>{
 for(const patch of [{upload:async()=>{throw Error('upload failed');}},{head:async()=>'newer'},{upload:async()=>null}]){
  const f=fixture(patch);await assert.rejects(releaseVersion(f.methods));assert.equal(f.current(),old);assert.ok(!f.events.includes(next));
 }
});
test('only the uploaded exact version takes traffic, and failed or uncertain activation rolls back code/assets',async()=>{
 const success=fixture();assert.equal(await releaseVersion(success.methods),next);assert.equal(success.current(),next);
 const unhealthy=fixture({healthy:async()=>{throw Error('live check failed');}});await assert.rejects(releaseVersion(unhealthy.methods),/live check/);assert.equal(unhealthy.current(),old);
 const uncertain=fixture();const activate=uncertain.methods.activate;uncertain.methods.activate=async version=>{await activate(version);if(version===next)throw Error('activation response lost');};
 await assert.rejects(releaseVersion(uncertain.methods),/response lost/);assert.equal(uncertain.current(),old);
});
test('lost leases and mixed active traffic cannot activate an unreviewed release',async()=>{
 const lost=fixture({assertLease:async()=>{throw Error('lease lost');}});await assert.rejects(releaseVersion(lost.methods),/lease lost/);assert.equal(lost.current(),old);
 const mixed=fixture({active:async()=>[{version_id:old,percentage:50},{version_id:next,percentage:50}]});await assert.rejects(releaseVersion(mixed.methods),/one healthy/);assert.deepEqual(mixed.events,[]);
});
test('public release waits for matching CMS commit and content without holding its deployment lock',async()=>{
 const expected={sourceCommit:'exact',contentHash:'content'};let reads=0,now=0;
 await awaitBackendRelease({expected,head:async()=>'exact',read:async()=>++reads<3?{...expected,sourceCommit:'old'}:expected,now:()=>now,wait:async ms=>{now+=ms;},timeoutMs:40_000});assert.equal(reads,3);
 await assert.rejects(awaitBackendRelease({expected,head:async()=>'newer',read:async()=>expected}),/Stale/);
 now=0;await assert.rejects(awaitBackendRelease({expected,head:async()=>'exact',read:async()=>({...expected,contentHash:'wrong'}),now:()=>now,wait:async ms=>{now+=ms;},timeoutMs:20_000}),/existing public version retained/);
});
test('coordinated builds retry a busy deployment lease, but stop for stale source or authentication failure',async()=>{
 let tries=0,now=0;const busy=()=>{const error=Error('busy');error.status=409;throw error;};
 assert.equal(await claimDeployment({commit:'exact',head:async()=>'exact',claim:async()=>++tries<3?busy():'lease',now:()=>now,wait:async ms=>{now+=ms;}}),'lease');assert.equal(tries,3);
 await assert.rejects(claimDeployment({commit:'exact',head:async()=>'new',claim:async()=>assert.fail('must not claim')}),/Stale/);
 await assert.rejects(claimDeployment({commit:'exact',head:async()=>'exact',claim:async()=>{throw Error('unauthorized');}}),/unauthorized/);
});
