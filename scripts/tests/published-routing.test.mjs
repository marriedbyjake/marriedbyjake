import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=source=>`data:text/javascript,${encodeURIComponent(source)}`;
const compile=source=>moduleUrl(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const routingSource=(await readFile(new URL('../../src/lib/published-routing.ts',import.meta.url),'utf8'))
 .replace("from '../data/redirects.json'",`from '${moduleUrl('export const redirects=[{source:"/old",destination:"/contact"}];')}'`)
 .replace("from '../../content/published/shared.json?public-redirects'",`from '${moduleUrl('export default [];')}'`)
 .replace("from '../../content/published/manifest.json'",`from '${moduleUrl('export default {counts:{weddingtestimonials:585}};')}'`);
const routingModule=compile(routingSource);const {publicRoute}=await import(routingModule);
const route=path=>publicRoute(new URL(path,'https://marriedbyjake.com'));
test('query pagination maps to generated assets and clamps aliases',()=>{
 assert.equal(route('/weddingtestimonials').asset,'/weddingtestimonials.html');
 assert.equal(route('/weddingtestimonials?page=25').asset,'/__published/testimonial-pages/25.html');
 for(const [path,target] of [['?page=1','/weddingtestimonials'],['?page=0','/weddingtestimonials'],['?page=02','/weddingtestimonials?page=2'],['?page=999','/weddingtestimonials?page=25'],['?page=abc','/weddingtestimonials']])assert.deepEqual(route('/weddingtestimonials'+path),{redirect:target,status:302});
});
test('private routes stay dynamic and internal assets are unreachable directly',()=>{
 for(const path of ['/_preview/posts/entry?_preview=signed','/_emdash/admin','/_emdash/api/auth/me','/_image?href=private'])assert.equal(route(path).dynamic,true);
 for(const path of ['/__published/testimonial-pages/25','/__published/testimonial-pages/25.html'])assert.equal(route(path).denied,404);
 for(const path of ['/?_preview=expired','/blog/post?_edit'])assert.equal(route(path).denied,403);
});
test('canonical and historical redirects preserve established behavior',()=>{
 assert.equal(route('/old').redirect,'/contact');assert.equal(route('/contact/').redirect,'https://marriedbyjake.com/contact');
 assert.equal(route('https://www.marriedbyjake.com/contact?source=test').redirect,'https://marriedbyjake.com/contact?source=test');
 assert.equal(route('/blog/post.html').redirect,'https://marriedbyjake.com/blog/post');
 assert.equal(route('/_astro/file.webp').asset,'/_astro/file.webp');assert.equal(route('/rss.xml').asset,'/rss.xml');
});
async function workerWithCms(source){
 const worker=await readFile(new URL('../../src/worker.ts',import.meta.url),'utf8');
 return (await import(compile(worker.replace('from "./lib/published-routing"',`from "${routingModule}"`).replaceAll('import("./cms-worker")',`import("${moduleUrl(source)}")`)))).default;
}
test('public requests do not initialize the CMS, even before the first private request',async()=>{
 let initialized=0,dynamic=0;globalThis.publishingWorkerTest={initialize:()=>initialized++,dynamic:()=>{dynamic++;return new Response('private',{headers:{'Cache-Control':'private, no-store'}});}};
 const worker=await workerWithCms('globalThis.publishingWorkerTest.initialize();export default {fetch:()=>globalThis.publishingWorkerTest.dynamic()};');
 assert.equal(initialized,0,'Importing the public entry must not initialize the CMS');
 const assetRequests=[];
 const env={DB:{prepare(){throw Error('Public request touched D1');}},ASSETS:{fetch:async(url)=>{assetRequests.push(url);return new Response('static HTML',{headers:{'Content-Type':'text/html'}});}}};
 for(const path of ['/','/weddingtestimonials?page=25','/blog/post','/search.json','/missing']){
  const response=await worker.fetch(new Request('https://marriedbyjake.com'+path),env,{});assert.equal(await response.text(),'static HTML');assert.match(response.headers.get('Cache-Control'),/^public/);
 }
 assert.equal(initialized,0);assert.equal(dynamic,0);assert.ok(assetRequests[1].endsWith('/__published/testimonial-pages/25.html'));
 for(const [path,status] of [['/?_preview=expired',403],['/__published/testimonial-pages/25.html',404],['https://www.marriedbyjake.com/contact?test=preserved',301],['/contact/',301]])assert.equal((await worker.fetch(new Request(new URL(path,'https://marriedbyjake.com')),env,{})).status,status);
 assert.equal(initialized,0,'Redirects and denied requests must also avoid CMS initialization');
 await worker.fetch(new Request('https://marriedbyjake.com/_preview/posts/entry?_preview=signed'),env,{});assert.equal(dynamic,1);
 assert.equal(initialized,1);
 await worker.fetch(new Request('https://marriedbyjake.com/_emdash/admin'),env,{});assert.equal(dynamic,2);assert.equal(initialized,1,'The module is reusable, without caching request data');
 assert.equal((await worker.fetch(new Request('https://marriedbyjake.com/',{method:'POST'}),env,{})).status,405);
 delete globalThis.publishingWorkerTest;
});
test('a CMS module initialization failure cannot take down the published site or bypass preview denials',async()=>{
 const worker=await workerWithCms('throw Error("Synthetic CMS initialization failure"); export default {};');
 const env={ASSETS:{fetch:async()=>new Response('healthy published release')}};
 const get=path=>worker.fetch(new Request(new URL(path,'https://marriedbyjake.com')),env,{});
 assert.equal(await (await get('/')).text(),'healthy published release');
 await assert.rejects(get('/_emdash/admin'),/Synthetic CMS initialization failure/);
 assert.equal(await (await get('/blog/published-post')).text(),'healthy published release');
 assert.equal((await get('/?_preview=expired')).status,403);
 assert.equal((await get('/__published/testimonial-pages/2.html')).status,404);
});
test('a cold scheduled invocation loads the CMS handler and retains the controller, environment and execution context',async()=>{
 let initialized=0;const calls=[];globalThis.scheduledWorkerTest={initialize:()=>initialized++,scheduled:(...args)=>calls.push(args)};
 try{
  const worker=await workerWithCms('globalThis.scheduledWorkerTest.initialize(); export default {scheduled:(...args)=>globalThis.scheduledWorkerTest.scheduled(...args)};');
  assert.equal(initialized,0);
  const controller={cron:'* * * * *'},env={PUBLISHING_ENABLED:'true'},ctx={waitUntil(){}};
  await worker.scheduled(controller,env,ctx);
  assert.equal(initialized,1);assert.deepEqual(calls,[[controller,env,ctx]]);
 }finally{delete globalThis.scheduledWorkerTest;}
});
