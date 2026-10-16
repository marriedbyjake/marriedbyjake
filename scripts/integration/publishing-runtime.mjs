import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generateKeyPairSync} from 'node:crypto';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {schemaSql,seed} from './fixtures/cms.mjs';
import {snapshotSql,projectPublished,releaseFiles,json,sha256} from '../lib/published-content.mjs';
import {gitBlobHash} from '../../src/publishing/github.mjs';
import {retryPublishing} from '../../src/publishing/ledger.mjs';
const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const bundle=await build({entryPoints:['scripts/integration/fixtures/publisher-worker.mjs'],bundle:true,write:false,format:'esm',platform:'neutral',external:['node:*'],target:'es2022'});
async function fixture(fn){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mbj-native-publisher-'));
 let mf;
 try{
  const options={script:bundle.outputFiles[0].text,modules:true,host:'127.0.0.1',port:0,compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['MEDIA'],resourcePersistencePath:directory,outboundService:async()=>new Response('External network forbidden',{status:599})};
  mf=new Miniflare(convertV4MiniflareOptions(options));let db=await mf.getD1Database('DB');let bucket=await mf.getR2Bucket('MEDIA');await seed(db);
  const raw=await db.prepare(snapshotSql()).first();const projected=await projectPublished(JSON.parse(raw.snapshot),async()=>{throw Error('No published image fixture expected');});
  const {files}=releaseFiles(projected);const paths={'src/worker.ts':'e'.repeat(40)};
  for(const [name,body]of Object.entries(files)){const bytes=Buffer.from(body),hash=gitBlobHash(bytes);paths[`content/published/${name}`]=hash;await bucket.put(`__test/blob/${hash}`,bytes);}
  const base={head:'a'.repeat(40),tree:'b'.repeat(40)};
  await bucket.put('__test/base',JSON.stringify(base));await bucket.put(`__test/tree/${base.tree}`,JSON.stringify(paths));await bucket.put(`__test/commit/${base.head}`,JSON.stringify({tree:{sha:base.tree}}));
  const bindings={PUBLISHING_BASELINE_HASH:projected.contentHash,GITHUB_APP_ID:'123',GITHUB_INSTALLATION_ID:'456',GITHUB_REPOSITORY_ID:'1104160905',GITHUB_APP_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})};
  await mf.setOptions(convertV4MiniflareOptions({...options,bindings}));db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('MEDIA');
  const tick=async(path='/tick')=>(await mf.dispatchFetch('http://localhost'+path)).json();
  const state=async()=>(await mf.dispatchFetch('http://localhost/state')).json();
  const get=async key=>{const object=await bucket.get('__test/'+key);return object?object.json():undefined;};
  const put=(key,value)=>bucket.put('__test/'+key,JSON.stringify(value));
  const context={tick,state,get,put,base,baselineHash:projected.contentHash,restart:async()=>{await mf.dispose();mf=new Miniflare(convertV4MiniflareOptions({...options,bindings}));db=await mf.getD1Database('DB');bucket=await mf.getR2Bucket('MEDIA');}};
  Object.defineProperties(context,{db:{get:()=>db},bucket:{get:()=>bucket}});await fn(context);
 }finally{await mf?.dispose();await fs.rm(directory,{recursive:true,force:true});}
}
async function bootstrap(f){assert.equal((await f.tick()).phase,'initialized');assert.equal((await f.tick()).phase,'healthy');}
async function republish(db,title='New synthetic published title'){
 await db.prepare("INSERT INTO revisions(id,created_at) VALUES('new-live-revision','2026-02-02T00:00:00Z') ON CONFLICT(id) DO NOTHING").run();
 await db.prepare("UPDATE ec_posts SET title=?,live_revision_id='new-live-revision' WHERE id='posts-id'").bind(title).run();
}
test('native GitHub transport preserves the Workers fetch receiver',async()=>{
 const native=await build({stdin:{contents:`import {GitHubPublisher} from './src/publishing/github.mjs';export default {async fetch(request,env){try{return Response.json({head:await new GitHubPublisher(env).head()});}catch(error){return Response.json({error:error.message},{status:500});}}}`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'neutral',external:['node:*'],target:'es2022'});
 const calls=[];
 const mf=new Miniflare(convertV4MiniflareOptions({script:native.outputFiles[0].text,modules:true,host:'127.0.0.1',port:0,compatibilityDate:'2026-10-01',compatibilityFlags:['nodejs_compat'],bindings:{GITHUB_APP_ID:'123',GITHUB_INSTALLATION_ID:'456',GITHUB_REPOSITORY_ID:'1104160905',GITHUB_APP_PRIVATE_KEY:privateKey.export({type:'pkcs8',format:'pem'})},outboundService:async request=>{
  const url=new URL(request.url);calls.push(url.pathname);assert.equal(url.hostname,'api.github.com');
  if(url.pathname==='/app/installations/456/access_tokens')return Response.json({token:'synthetic-token',permissions:{contents:'write'},repositories:[{id:1104160905,full_name:'marriedbyjake/marriedbyjake'}],expires_at:new Date(Date.now()+3600_000).toISOString()});
  if(url.pathname==='/repos/marriedbyjake/marriedbyjake/git/ref/heads/main')return Response.json({object:{sha:'a'.repeat(40)}});
  return new Response('External network forbidden',{status:599});
 }}));
 try{const response=await mf.dispatchFetch('http://localhost/');const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.head,'a'.repeat(40));assert.equal(calls.length,2);}finally{await mf.dispose();}
});
test('a failed initial GitHub check can retry without an existing baseline',()=>fixture(async f=>{
 assert.equal((await f.tick('/tick?scenario=network-error')).phase,'retrying');
 assert.equal((await f.state()).baselineHash,undefined);
 assert.equal(await retryPublishing(f.db),true);
 await bootstrap(f);
}));
test('automatic initialization recovery clears the old failure and retry time',()=>fixture(async f=>{
 assert.equal((await f.tick('/tick?scenario=network-error')).phase,'retrying');
 await f.db.prepare("UPDATE options SET value=json_set(value,'$.retryAt',0) WHERE name='marriedbyjake:publishing'").run();
 await bootstrap(f);
 const state=await f.state();assert.equal(state.reason,undefined);assert.equal(state.retryAt,undefined);
}));
test('an unchanged healthy snapshot clears a recovered fingerprint failure',()=>fixture(async f=>{
 await bootstrap(f);
 await f.db.prepare("UPDATE options SET value=json_set(value,'$.phase','retrying','$.failures',1,'$.retryAt',0,'$.reason','Synthetic fingerprint read failure') WHERE name='marriedbyjake:publishing'").run();
 assert.equal((await f.tick()).phase,'healthy');
 const state=await f.state();assert.equal(state.phase,'healthy');assert.equal(state.failures,0);assert.equal(state.reason,undefined);assert.equal(state.retryAt,undefined);
}));
test('native D1/R2 controller excludes drafts and recovers commit intent after Worker restart',()=>fixture(async f=>{
 assert.equal((await f.tick('/disabled')).phase,'disabled');assert.equal((await f.db.prepare("SELECT COUNT(*) AS n FROM options").first()).n,0);
 await bootstrap(f);const before=(await f.get('calls')).length;
 await f.db.prepare("UPDATE ec_posts SET title='ANOTHER PRIVATE DRAFT' WHERE id='private-draft-id'").run();assert.equal((await f.tick()).phase,'healthy');assert.equal((await f.get('calls')).length,before);
 await republish(f.db);assert.equal((await f.tick()).phase,'commit-prepared');let state=await f.state();assert.ok(state.job.commit);assert.equal(await f.get('head'),undefined);
 const intended=state.job.commit;await f.restart();assert.equal((await f.tick()).phase,'awaiting-build');state=await f.state();assert.equal(state.pending.commit,intended);assert.equal(await f.get('head'),intended);
 const commit=await f.get(`commit/${intended}`),tree=await f.get(`tree/${commit.tree.sha}`);assert.equal(tree['src/worker.ts'],'e'.repeat(40));
 const posts=await (await f.bucket.get(`__test/blob/${tree['content/published/posts.json']}`)).text();assert.ok(posts.includes('New synthetic published title'));assert.ok(!posts.includes('PRIVATE DRAFT'));assert.ok(!posts.includes('private-draft-id'));
 await f.put('live',{sourceCommit:'f'.repeat(40),contentHash:state.pending.contentHash});assert.equal((await f.tick()).phase,'awaiting-build');
 await f.put('live',{sourceCommit:intended,contentHash:state.pending.contentHash});assert.equal((await f.tick()).phase,'healthy');assert.equal((await f.state()).pending,undefined);
}));
test('native controller leaves private-only media out, publishes a referenced image, then removes it on unpublish',()=>fixture(async f=>{
 const bytes=Buffer.from('synthetic published image bytes'),hash=sha256(bytes);
 await f.db.prepare('INSERT INTO media(id,filename,mime_type,size,width,height,alt,caption,storage_key,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?)').bind('photo','fixture.webp','image/webp',bytes.length,1,1,'Synthetic alt','','private-photo',hash).run();
 await f.bucket.put('private-photo',bytes);await bootstrap(f);let state=await f.state();assert.deepEqual(state.cache,{});assert.equal((await f.get('calls')).filter(call=>call.pathname.endsWith('/git/blobs')&&call.method==='POST').length,0);
 await f.db.prepare('UPDATE ec_posts SET featured_image=? WHERE id=?').bind(JSON.stringify({id:'photo',provider:'local',meta:{storageKey:'private-photo'},mimeType:'image/webp',width:1,height:1}),'posts-id').run();await republish(f.db);
 assert.equal((await f.tick()).phase,'commit-prepared');assert.equal((await f.tick()).phase,'awaiting-build');state=await f.state();
 let commit=await f.get(`commit/${state.pending.commit}`),tree=await f.get(`tree/${commit.tree.sha}`);assert.ok(tree[`src/images/published/${hash}.webp`]);
 await f.put('live',{sourceCommit:state.pending.commit,contentHash:state.pending.contentHash});await f.tick();
 await f.db.prepare("UPDATE ec_posts SET status='draft' WHERE id='posts-id'").run();assert.equal((await f.tick()).phase,'commit-prepared');await f.tick();state=await f.state();
 commit=await f.get(`commit/${state.pending.commit}`);tree=await f.get(`tree/${commit.tree.sha}`);assert.ok(!tree[`src/images/published/${hash}.webp`]);
 const media=JSON.parse(await (await f.bucket.get(`__test/blob/${tree['content/published/media.json']}`)).text());assert.deepEqual(media.items,{});
}));
test('native controller rejects a Git race and preserves the other head',()=>fixture(async f=>{
 await bootstrap(f);await republish(f.db);await f.tick();assert.equal((await f.tick('/tick?scenario=git-race')).phase,'paused');assert.equal(await f.get('head'),'d'.repeat(40));assert.equal((await f.state()).pending,undefined);
}));
test('native controller fences a concurrent CMS publication and never overwrites CMS content',()=>fixture(async f=>{
 await bootstrap(f);await republish(f.db);assert.equal((await f.tick('/tick?scenario=cms-race')).phase,'retrying');assert.equal(await f.get('head'),undefined);
 assert.equal((await f.db.prepare("SELECT title FROM ec_posts WHERE id='posts-id'").first()).title,'Newer CMS publication');assert.equal((await f.state()).job.commit,undefined);
}));
