import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const moduleUrl=source=>`data:text/javascript,${encodeURIComponent(source)}`;
const compile=source=>moduleUrl(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
const routingSource=(await readFile(new URL('../../src/lib/published-routing.ts',import.meta.url),'utf8'))
 .replace("from '../data/redirects.json'",`from '${moduleUrl('export const redirects=[{source:"/old",destination:"/contact"}];')}'`)
 .replace("from '../../content/published/shared.json'",`from '${moduleUrl('export default {redirects:[]};')}'`)
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
test('the real Worker public path never touches the CMS database or handler',async()=>{
 let dynamic=0;globalThis.publishingWorkerTest={dynamic:()=>{dynamic++;return new Response('private',{headers:{'Cache-Control':'private, no-store'}});}};
 let source=await readFile(new URL('../../src/worker.ts',import.meta.url),'utf8');
 source=source.replace('from "./publishing/publisher.mjs"',`from "${moduleUrl('export const runPublisher=async()=>({phase:"disabled"});')}"`);
 source=source.replace('from "./lib/published-routing"' ,`from "${routingModule}"`).replace('from "@emdash-cms/cloudflare/worker"',`from "${moduleUrl('export default {fetch:()=>globalThis.publishingWorkerTest.dynamic()};export const createScheduledHandler=()=>()=>{};')}"`);
 const {default:worker}=await import(compile(source));const assetRequests=[];
 const env={DB:{prepare(){throw Error('Public request touched D1');}},ASSETS:{fetch:async(url)=>{assetRequests.push(url);return new Response('static HTML',{headers:{'Content-Type':'text/html'}});}}};
 for(const path of ['/','/weddingtestimonials?page=25','/blog/post','/search.json','/missing']){
  const response=await worker.fetch(new Request('https://marriedbyjake.com'+path),env,{});assert.equal(await response.text(),'static HTML');assert.match(response.headers.get('Cache-Control'),/^public/);
 }
 assert.equal(dynamic,0);assert.ok(assetRequests[1].endsWith('/__published/testimonial-pages/25.html'));
 await worker.fetch(new Request('https://marriedbyjake.com/_preview/posts/entry?_preview=signed'),env,{});assert.equal(dynamic,1);
 assert.equal((await worker.fetch(new Request('https://marriedbyjake.com/',{method:'POST'}),env,{})).status,405);
 delete globalThis.publishingWorkerTest;
});
