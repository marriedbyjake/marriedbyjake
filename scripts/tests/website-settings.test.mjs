import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {websiteDefaults,websiteBlockTypes,websiteCollection,websiteFields,publishedSeoFields,validateWebsiteEntry,safePublicHref} from '../lib/website-model.mjs';
import {fixtureRows} from '../integration/fixtures/cms.mjs';
import {projectPublished,sha256} from '../lib/published-content.mjs';
const source=()=>({tables:{...fixtureRows(),media:[],options:[],_emdash_menus:[],_emdash_menu_items:[]}});
test('every initial section passes the installed native EmDash block schema, including rich text and repeaters',async()=>{
 await fs.mkdir('.emdash',{recursive:true}); const directory=await fs.mkdtemp('.emdash/website-test-'); const output=path.resolve(directory,'native.mjs');
 await build({outfile:output,packages:'external',stdin:{contents:`export {normalizeBlocksData} from './node_modules/emdash/src/schema/block-values.ts'; export {createBlockTypeBody,createCollectionBody,createFieldBody} from './node_modules/emdash/src/api/schemas/schema.ts';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node'});
 const native=await import(pathToFileURL(output).href);
 await fs.rm(directory,{recursive:true});
 native.createCollectionBody.parse(websiteCollection);websiteFields.forEach(f=>native.createFieldBody.parse(f));publishedSeoFields.forEach(f=>native.createFieldBody.parse(f));
 const types=new Map(Object.entries(websiteBlockTypes).map(([slug,type])=>{native.createBlockTypeBody.parse({slug,...type});return[slug,{slug,currentVersion:1,versions:[{version:1,fields:type.fields}]}];}));
 const collection={fields:websiteFields};
 for(const[slug,entry]of Object.entries(websiteDefaults)){
  const normalized=await native.normalizeBlocksData({},collection,{title:entry.title,content:entry.content},{},{},false,types);
  assert.deepEqual(normalized.content,entry.content,slug);validateWebsiteEntry(slug,normalized);
 }
});
test('invalid settings stop a release, including missing sections and unsafe embedded forms',async()=>{
 for(const mutate of [s=>s.tables.ec_website.splice(0,1),s=>s.tables.ec_website.find(e=>e.slug==='contact-form').content=JSON.stringify([{...websiteDefaults['contact-form'].content[0],url:'https://untrusted.example/form'}]),s=>s.tables.ec_website.find(e=>e.slug==='seo-home').content=JSON.stringify([{...websiteDefaults['seo-home'].content[0],canonical:'javascript:alert(1)'}])]){
  const snapshot=source();mutate(snapshot);await assert.rejects(projectPublished(snapshot,async()=>{throw Error('No media expected')}));
 }
 for(const path of ['javascript:alert(1)','//foreign.example','/_emdash/admin','/?_preview=secret','https://user:pass@example.com/'])assert.equal(safePublicHref(path),false,path);
});
test('published menu references resolve only to public entries and redirects retain their status',async()=>{
 const snapshot=source();snapshot.tables.ec_posts[0].translation_group='post-group';snapshot.tables._emdash_menus=[{id:'menu',name:'primary-navigation',label:'Header',locale:'en'}];
 snapshot.tables._emdash_menu_items=[{id:'link',menu_id:'menu',parent_id:null,type:'post',reference_collection:'posts',reference_id:'post-group',label:'Read',sort_order:0}];snapshot.tables._emdash_redirects=[{source:'/older',destination:'/contact',type:302,enabled:1,is_pattern:0}];
 const projected=await projectPublished(snapshot,async()=>{});assert.equal(projected.release.shared.menuItems[0].href,'/blog/synthetic-entry');assert.equal(projected.release.shared.redirects[0].type,302);
 snapshot.tables.ec_posts[0].status='draft';await assert.rejects(projectPublished(snapshot,async()=>{}),/published content reference/);
 snapshot.tables.ec_posts[0].status='published';snapshot.tables._emdash_menu_items[0].parent_id='link';await assert.rejects(projectPublished(snapshot,async()=>{}),/cycle/);
});
test('settings export only public names; nested section and SEO images require verified committed bytes',async()=>{
 const snapshot=source(),bytes=Buffer.from('Synthetic image'),hash=sha256(bytes);
 snapshot.tables.media=[{id:'public-logo',mime_type:'image/webp',size:bytes.length,content_hash:hash,storage_key:'logo.webp',width:100,height:100}];
 snapshot.tables.options=[{name:'site:logo',value:JSON.stringify({mediaId:'public-logo',alt:'Brand'})},{name:'site:email_api_key',value:'"PRIVATE"'}];
 snapshot.tables.ec_posts[0].social_image=JSON.stringify({id:'public-logo',provider:'local'});
 const projected=await projectPublished(snapshot,async()=>bytes);assert.deepEqual(Object.keys(projected.release.media),['public-logo']);assert.deepEqual(Object.keys(projected.release.shared.settings),['site:logo']);
 await assert.rejects(projectPublished(snapshot,async()=>Buffer.from('Wrong bytes')),/size|checksum/);
});
