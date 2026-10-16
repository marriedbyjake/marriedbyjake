import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {GitHubPublisher,gitBlobHash,managedPath} from '../../src/publishing/github.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const config={GITHUB_APP_ID:'123',GITHUB_INSTALLATION_ID:'456',GITHUB_REPOSITORY_ID:'1104160905',GITHUB_APP_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})};
const oid='a'.repeat(40),next='b'.repeat(40);
function mock(options={}){
 const calls=[];let guard=0;
 const fetcher=async(url,init)=>{
  calls.push({url,init});
  if(url.includes('/access_tokens')){
   const token=init.headers.Authorization.slice(7);const parts=token.split('.');assert.ok(verify('RSA-SHA256',Buffer.from(parts.slice(0,2).join('.')),publicKey,Buffer.from(parts[2],'base64url')));
   assert.deepEqual(JSON.parse(init.body),{repository_ids:[1104160905],permissions:{contents:'write'}});
   return Response.json({token:'synthetic-installation-token',permissions:{contents:'write'},repositories:[{id:1104160905,full_name:options.wrongRepository?'other/repo':'marriedbyjake/marriedbyjake'}],expires_at:new Date(Date.now()+3600_000).toISOString()});
  }
  if(url.endsWith('/git/blobs')){const body=JSON.parse(init.body);return Response.json({sha:gitBlobHash(Buffer.from(body.content,'base64'))});}
  if(url.endsWith('/graphql')){
   const body=JSON.parse(init.body);assert.deepEqual(body.variables.input.refUpdates,[{name:'refs/heads/main',beforeOid:oid,afterOid:next,force:false}]);
   if(options.lostResponse)throw Error('synthetic lost response');
   return Response.json(options.conflict?{errors:[{message:'synthetic conflict'}]}:{data:{updateRefs:{clientMutationId:null}}});
  }
  if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:options.accepted?next:oid}});
  throw Error('Unexpected test request');
 };
 return {calls,client:new GitHubPublisher(config,fetcher,async()=>{guard++;}),guards:()=>guard};
}
test('runtime App tokens are signed, short-lived, repo-only and reused in memory',async()=>{
 const {client,calls,guards}=mock();const bytes=Buffer.from('published bytes');assert.equal(await client.upload(bytes),gitBlobHash(bytes));await client.upload(bytes);
 assert.equal(calls.filter(call=>call.url.includes('/access_tokens')).length,1);assert.equal(guards(),2);
 const payload=JSON.parse(Buffer.from(calls[0].init.headers.Authorization.split('.')[1],'base64url'));assert.ok(payload.exp-payload.iat<=600);
});
test('a token scoped to any other repository is rejected',async()=>{
 const {client,calls}=mock({wrongRepository:true});await assert.rejects(client.upload(Buffer.from('public')),/restricted/);assert.equal(calls.length,1);
});
test('Git API compare-and-swap rejects concurrent refs without force',async()=>{
 const {client}=mock({conflict:true});await assert.rejects(client.update({head:oid,nodeId:'repo-node'},next),/reference changed/);
});
test('accepted atomic update with a lost response is recovered by exact head',async()=>{
 const {client}=mock({lostResponse:true,accepted:true});await client.update({head:oid,nodeId:'repo-node'},next);
});
test('unapproved targets and paths are rejected before any API write',async()=>{
 const {client,calls}=mock();await assert.rejects(client.request('https://example.invalid/steal','POST',{}),/Unapproved/);
 await assert.rejects(client.commit({paths:{}},{'src/worker.ts':oid},'hash'),/unapproved path/);assert.equal(calls.length,0);
 assert.ok(managedPath('content/published/posts.json'));assert.ok(!managedPath('content/published/../private.json'));
});
