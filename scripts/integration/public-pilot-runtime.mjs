import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {buildSource} from '../lib/build-source.mjs';
const directory=path.resolve('.emdash/public-pilot');
const config=JSON.parse(await fs.readFile(path.join(directory,'wrangler.json'),'utf8'));
const evidence=JSON.parse(await fs.readFile(path.join(directory,'pilot-manifest.json'),'utf8'));
const worker=await fs.readFile(path.join(directory,config.main));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

test('the packaged public-only Worker serves every canonical from identical committed-build bytes, with no CMS or outbound access',async()=>{
 assert.equal(evidence.sourceCommit,buildSource().commit,'Package must match the current clean checkout');
 assert.deepEqual(Object.keys(config).sort(),['account_id','assets','base_dir','compatibility_date','find_additional_modules','main','name','no_bundle','observability','preview_urls','routes','workers_dev'].sort());
 assert.equal(config.name,'marriedbyjake-public-pilot');assert.deepEqual(config.routes,[]);assert.equal(config.no_bundle,true);
 assert.equal(config.main,'server/worker.mjs');assert.equal(config.base_dir,'server');assert.equal(config.find_additional_modules,false);
 assert.equal(config.assets.binding,'ASSETS');assert.deepEqual(evidence.bindings,['ASSETS']);assert.equal(evidence.privateBackendConnected,false);
 assert.ok(worker.length<=32768);assert.equal(hash(worker),evidence.workerSha256);
 const persistence=await fs.mkdtemp(path.join(os.tmpdir(),'mbj-public-pilot-'));
 let outbound=0;
 const mf=new Miniflare(convertV4MiniflareOptions({script:worker.toString(),modules:true,host:'127.0.0.1',port:0,compatibilityDate:config.compatibility_date,
  assets:{directory:path.join(directory,'client'),binding:'ASSETS',run_worker_first:true,routerConfig:{has_user_worker:true},assetConfig:{html_handling:'none',not_found_handling:'404-page'}},
  resourcePersistencePath:persistence,outboundService:async()=>{outbound++;return new Response('External network forbidden',{status:599});},
 }));
 const get=(url,init)=>mf.dispatchFetch(new URL(url,'https://marriedbyjake-public-pilot.withersco.workers.dev'),{redirect:'manual',...init});
 try{
  const sitemap=await fs.readFile(path.join(directory,'client/sitemap-0.xml'),'utf8');
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>new URL(match[1].replaceAll('&amp;','&')));
  assert.ok(urls.length>0);assert.equal(new Set(urls.map(url=>url.href)).size,urls.length);
  for(const url of urls){
   const response=await get(url.pathname+url.search);assert.equal(response.status,200,url.pathname+url.search);
   assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.match(response.headers.get('Content-Security-Policy'),/script-src 'none'/);assert.match(response.headers.get('Content-Security-Policy'),/form-action 'none'/);
   const page=url.searchParams.get('page');
   const file=page?`__published/testimonial-pages/${page}.html`:url.pathname==='/'?'index.html':url.pathname.slice(1)+'.html';
   const actual=Buffer.from(await response.arrayBuffer()),expected=await fs.readFile(path.join(directory,'client',file));
   assert.equal(hash(actual),hash(expected),file);
  }
  for(const url of ['/search.json','/rss.xml','/sitemap-index.xml','/release.json']){
   const response=await get(url);assert.equal(response.status,200,url);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await fs.readFile(path.join(directory,'client',url))));
  }
  const release=await(await get('/release.json')).json();assert.equal(release.sourceCommit,evidence.sourceCommit);assert.equal(release.contentHash,evidence.contentHash);
  for(const [url,status] of [['/_emdash/admin',404],['/_emdash/api/media/file/private.png',404],['/_preview/posts/private?_preview=invalid',404],['/_image?href=https://example.invalid/private.png',404],['/_publishing',404],['/_publishing/deployment',404],['/__published/testimonial-pages/2.html',404],['/?_preview=invalid',403],['/missing-pilot-page',404]]){
   const response=await get(url);assert.equal(response.status,status,url);await response.arrayBuffer();
  }
  for(const [url,status,location] of [['/contact/',301,'https://marriedbyjake-public-pilot.withersco.workers.dev/contact'],['https://www.marriedbyjake.com/contact?keep=value',301,'https://marriedbyjake.com/contact?keep=value'],['/weddingtestimonials?page=01',302,'/weddingtestimonials'],['/weddingtestimonials?page=999',302,'/weddingtestimonials?page=25']]){
   const response=await get(url);assert.equal(response.status,status);assert.equal(response.headers.get('Location'),location);await response.arrayBuffer();
  }
  assert.equal((await get('/contact',{method:'POST'})).status,405);
  const head=await get('/',{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
  assert.match(await(await get('/robots.txt')).text(),/Disallow: \//);
  const image=(await fs.readdir(path.join(directory,'client/_astro'))).find(file=>file.endsWith('.webp'));
  const response=await get('/_astro/'+image);assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/immutable/);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(await fs.readFile(path.join(directory,'client/_astro',image))));
  assert.equal(outbound,0);
  console.log(JSON.stringify({canonicalPages:urls.length,byteIdentical:true,privateRoutesDenied:true,completeWorkerBytes:worker.length,outboundCalls:outbound}));
 }finally{await mf.dispose();await fs.rm(persistence,{recursive:true,force:true});}
});
