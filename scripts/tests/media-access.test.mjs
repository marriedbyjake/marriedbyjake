import test from 'node:test';
import assert from 'node:assert/strict';
import {generatePreviewToken,verifyPreviewToken,parseContentId} from 'emdash';
import {mediaRequest,authorizeMedia,committedMediaRedirect} from '../../src/lib/media-access.mjs';
const url=path=>new URL(path,'https://marriedbyjake.com');
test('historical published transforms retain dimensions while resolving only immutable committed bytes',()=>{
 const source=url('/_image?href=/_emdash/api/media/file/old.png&w=640&h=640&f=webp&unknown=discard');
 const target=mediaRequest(source),image={src:'/_astro/committed.hash.png'};
 const destination=new URL(committedMediaRedirect(target,image,source),source);
 assert.equal(destination.pathname,'/_image');assert.equal(destination.searchParams.get('href'),image.src);
 assert.equal(destination.searchParams.get('w'),'640');assert.equal(destination.searchParams.get('h'),'640');assert.equal(destination.searchParams.get('f'),'webp');assert.equal(destination.searchParams.has('unknown'),false);
 assert.equal(committedMediaRedirect({original:true},image,source),image.src);
 assert.equal(committedMediaRedirect(target,undefined,source),undefined);
});
test('draft-media guard denies original and transform bypasses, encoded keys and remote fetches',async()=>{
 for(const path of ['/_emdash/api/media/file/private.png','/_emdash/api/media/file/%70rivate.png','/_image?href=https://other.example/_emdash/api/media/file/private.png','/_image?href=/_astro/%252e%252e/private.png','/_image?href=https://other.example/private.png']){
  const target=mediaRequest(url(path));assert.ok(target);assert.equal(await authorizeMedia({target,editor:false}),false);
 }
 assert.equal(mediaRequest(url('/_image?href=/_astro/public.hash.webp')),undefined);
 for(const href of ['https://other.example/_emdash/api/media/file/private.png','//other.example/_emdash/api/media/file/private.png']){
  const target=mediaRequest(url('/_image?href='+encodeURIComponent(href)));
  assert.equal(await authorizeMedia({target,editor:true}),false);
  assert.equal(await authorizeMedia({target,preview:{collection:'posts',id:'first'},loadEntry:()=>{throw Error('Remote URLs must be rejected before reading content');}}),false);
 }
 assert.equal(mediaRequest(url('/')),undefined);
});
test('real EmDash signed previews expire, reject tampering and authorize only the referenced entry media',async()=>{
 const secret='synthetic-local-signing-key';
 const token=await generatePreviewToken({contentId:'posts:first',secret});
 const valid=await verifyPreviewToken({token,secret});assert.equal(valid.valid,true);
 const preview=parseContentId(valid.payload.cid);
 const loadEntry=async(c,id)=>c==='posts'&&id==='first'?{data:{content:[{_type:'image',asset:{_ref:'photo'}}]}}:undefined;
 const loadMedia=async key=>({id:key==='first.png'?'photo':'other-photo'});
 assert.equal(await authorizeMedia({target:{key:'first.png'},preview,loadEntry,loadMedia}),true);
 assert.equal(await authorizeMedia({target:{key:'other.png'},preview,loadEntry,loadMedia}),false);
 assert.equal(await authorizeMedia({target:{key:'first.png'},preview:{collection:'posts',id:'other'},loadEntry,loadMedia}),false);
 const expired=await generatePreviewToken({contentId:'posts:first',secret,expiresIn:-10});assert.equal((await verifyPreviewToken({token:expired,secret})).valid,false);
 assert.equal((await verifyPreviewToken({token:token+'x',secret})).valid,false);
 assert.equal((await verifyPreviewToken({token,secret:'wrong-key'})).valid,false);
});
