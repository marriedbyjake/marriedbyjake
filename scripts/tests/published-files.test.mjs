import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {writePublished} from '../lib/write-published.mjs';
import {collections,digest} from '../lib/published-content.mjs';
import {verifyPublished} from '../verify-published.mjs';
test('complete release replacement removes stale public assets without touching the archive; tampering fails',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mbj-publishing-test-'));
 try{
  await fs.mkdir(path.join(root,'src/images/published'),{recursive:true});await fs.writeFile(path.join(root,'src/images/published','obsolete.jpg'),'old');
  await fs.mkdir(path.join(root,'src/content/posts'),{recursive:true});await fs.writeFile(path.join(root,'src/content/posts/archive.md'),'preserve');
  const release={formatVersion:1,collections:Object.fromEntries(Object.keys(collections).map(name=>[name,{}])),media:{},shared:{settings:{},menus:[],menuItems:[],taxonomies:[],assignments:[],redirects:[]}};
  release.collections.pricing.index={cmsId:'price',data:{australian_price:'Exact approved price'}};
  const projected={release,contentHash:digest(release),assets:new Map()};await writePublished(root,projected);
  assert.deepEqual(await fs.readdir(path.join(root,'src/images/published')),[]);assert.equal(await fs.readFile(path.join(root,'src/content/posts/archive.md'),'utf8'),'preserve');
  assert.equal((await verifyPublished(root)).contentHash,projected.contentHash);
  await fs.appendFile(path.join(root,'content/published/posts.json'),' ');await assert.rejects(verifyPublished(root),/checksum mismatch/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
