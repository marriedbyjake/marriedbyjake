import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const directory=path.resolve('.emdash/public-delivery');
const assets=path.resolve('dist/client');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('the complete public package preserves every page and native private service requests, with independent CMS failures',async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));
 const config=JSON.parse(await fs.readFile(path.join(directory,'wrangler.json'),'utf8'));
 const worker=await fs.readFile(path.join(directory,'server/worker.mjs'));
 assert.equal(config.name,'marriedbyjake-public');assert.equal(config.base_dir,'server');assert.equal(config.find_additional_modules,false);
 assert.deepEqual(config.routes,[]);assert.deepEqual(manifest.bindings,['ASSETS','CMS']);
 assert.deepEqual(config.services,[{binding:'CMS',service:'marriedbyjake'}]);
 for(const key of ['vars','d1_databases','r2_buckets','kv_namespaces','images','triggers','compatibility_flags'])assert.equal(config[key],undefined,key);
 assert.ok(worker.length<=32768);assert.equal(hash(worker),manifest.workerSha256);
 const persistence=await fs.mkdtemp(path.join(os.tmpdir(),'mbj-public-delivery-'));let outbound=0;
 const common={compatibilityDate:config.compatibility_date,outboundService:async()=>{outbound++;return new Response('External network forbidden',{status:599});}};
 const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',port:0,resourcePersistencePath:persistence,workers:[
  {name:'front',script:worker.toString(),modules:true,...common,serviceBindings:{CMS:'cms'},assets:{directory:assets,binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true},assetConfig:{html_handling:'none',not_found_handling:'404-page'}}},
  {name:'cms',modules:true,...common,script:`export default {async fetch(request){
   const url=new URL(request.url);
   if(url.pathname==='/_emdash/api/synthetic-failure')throw Error('Synthetic CMS outage');
   return Response.json({url:request.url,method:request.method,origin:request.headers.get('Origin'),cookie:request.headers.get('Cookie'),authorization:request.headers.get('Authorization'),type:request.headers.get('Content-Type'),body:await request.text()},{status:202,headers:{'Cache-Control':'private, no-store','X-Robots-Tag':'noindex','Referrer-Policy':'no-referrer','Set-Cookie':'session=synthetic; Secure; HttpOnly; SameSite=Lax','Location':'https://marriedbyjake.com/_emdash/admin'}});
  }};`},
 ]}));
 const get=(url,init)=>mf.dispatchFetch(new URL(url,'https://marriedbyjake.com'),{redirect:'manual',...init});
 try{
  const sitemap=await fs.readFile(path.join(assets,'sitemap-0.xml'),'utf8');
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>new URL(match[1].replaceAll('&amp;','&')));
  for(const url of urls){
   const response=await get(url.href);assert.equal(response.status,200,url.href);assert.match(response.headers.get('Cache-Control'),/^public/);
   assert.equal(response.headers.get('Content-Security-Policy'),null,'Public scripts and forms must work');assert.equal(response.headers.get('X-Robots-Tag'),null);
   const page=url.searchParams.get('page');const file=page?`__published/testimonial-pages/${page}.html`:url.pathname==='/'?'index.html':url.pathname.slice(1)+'.html';
   assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await fs.readFile(path.join(assets,file))),file);
  }
  const release=await(await get('/release.json')).json();assert.equal(release.sourceCommit,manifest.sourceCommit);assert.equal(release.contentHash,manifest.contentHash);
  for(const resource of ['/search.json','/rss.xml','/sitemap-index.xml'])assert.equal((await get(resource)).status,200);
  const requestBody=JSON.stringify({challenge:'synthetic-passkey-challenge'});
  for(const privatePath of ['/_emdash/api/auth/verify','/_publishing/deployment','/_preview/posts/synthetic?_preview=synthetic-token','/_image?href=synthetic-private']){
   const response=await get(privatePath,{method:'POST',headers:{Origin:'https://marriedbyjake.com',Cookie:'session=synthetic','Authorization':'Bearer synthetic-lock-secret','Content-Type':'application/json'},body:requestBody});
   assert.equal(response.status,202,privatePath);assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.match(response.headers.get('Set-Cookie'),/HttpOnly/);assert.equal(response.headers.get('Location'),'https://marriedbyjake.com/_emdash/admin');
   assert.deepEqual(await response.json(),{url:'https://marriedbyjake.com'+privatePath,method:'POST',origin:'https://marriedbyjake.com',cookie:'session=synthetic',authorization:'Bearer synthetic-lock-secret',type:'application/json',body:requestBody});
  }
  assert.equal((await get('https://marriedbyjake-public.withersco.workers.dev/_emdash/admin')).status,404);
  const diagnostic=await get('https://marriedbyjake-public.withersco.workers.dev/');assert.equal(diagnostic.status,200);assert.match(diagnostic.headers.get('X-Robots-Tag'),/noindex/);
  assert.match(await(await get('https://marriedbyjake-public.withersco.workers.dev/robots.txt')).text(),/Disallow: \//);
  const failure=await get('/_emdash/api/synthetic-failure');assert.equal(failure.status,503);assert.match(failure.headers.get('Cache-Control'),/private, no-store/);
  assert.equal((await get('/')).status,200,'CMS outage must leave published content available');
  for(const [url,status] of [['/contact/',301],['https://www.marriedbyjake.com/contact?keep=value',301],['/?_preview=invalid',403],['/__published/testimonial-pages/2.html',404],['/missing-public-page',404],['/weddingtestimonials?page=999',302]])assert.equal((await get(url)).status,status,url);
  assert.equal((await get('/contact',{method:'POST'})).status,405);const head=await get('/',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
  const image=(await fs.readdir(path.join(assets,'_astro'))).find(file=>file.endsWith('.webp'));const response=await get('/_astro/'+image);assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/immutable/);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await fs.readFile(path.join(assets,'_astro',image))));
  assert.equal(outbound,0);console.log(JSON.stringify({canonicalPages:urls.length,byteIdentical:true,privateRequestAndResponsePreserved:true,cmsFailureLeavesPublicHealthy:true,workerBytes:worker.length,outboundCalls:outbound}));
 }finally{await mf.dispose();await fs.rm(persistence,{recursive:true,force:true});}
});
