import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { collections, projectPublished, sha256, verifyMedia } from '../lib/published-content.mjs';
const bytes = Buffer.from('synthetic image bytes');
function fixture() {
  const tables = {media:[],revisions:[]};
  for (const [name,fields] of Object.entries(collections)) {
    const data = Object.fromEntries(fields.map(field => [field,null]));
    if (name !== 'pricing') data.content = [{_type:'block',_key:'paragraph',style:'normal',markDefs:[{_key:'link',_type:'link',href:'/services'}],children:[{_type:'span',_key:'words',text:'Exact words — unchanged.',marks:['link']}]}];
    const row = {id:name+'-id',slug:name === 'pricing'?'index':'public-entry',status:'published',deleted_at:null,created_at:'2026-01-01T00:00:00Z',published_at:'2026-02-01T00:00:00Z',live_revision_id:name+'-revision',updated_at:'2026-09-01',draft_revision_id:'private-revision',...data};
    tables['ec_'+name] = [row,{...row,id:'private-draft',slug:'private-draft',status:'draft',content:'private draft must never appear'}, {...row,id:'trash-id',slug:'trashed',deleted_at:'2026-03-01'}];
    tables.revisions.push({id:row.live_revision_id,created_at:'2026-02-02T00:00:00Z',data:'private revision payload'});
  }
  tables.options = [{name:'emdash:site_title',value:'"Published title"'},{name:'emdash:preview_secret',value:'"PRIVATE-SECRET"'}];
  return {tables};
}
test('only published live values enter Git; rich text is lossless and drafts do not change digest',async()=>{
 const source=fixture(); const result=await projectPublished(source,async()=>bytes);
 for (const [name,entries] of Object.entries(result.release.collections)) {
   assert.deepEqual(Object.keys(entries),[name==='pricing'?'index':'public-entry']);
   assert.equal(Object.values(entries)[0].updatedAt,'2026-02-02T00:00:00Z');
   if(name!=='pricing') assert.deepEqual(Object.values(entries)[0].data.content,source.tables['ec_'+name][0].content);
 }
 const serialized=JSON.stringify(result.release);
 for(const privateValue of ['private-draft','private revision payload','PRIVATE-SECRET','draft_revision_id','updated_at'])assert.ok(!serialized.includes(privateValue));
 source.tables.ec_posts[0].updated_at='2027-01-01';source.tables.ec_posts[1].content='New private draft';
 assert.equal((await projectPublished(source,async()=>bytes)).contentHash,result.contentHash);
 source.tables.ec_posts[0].content[0].children[0].text='Republished wording';
 assert.notEqual((await projectPublished(source,async()=>bytes)).contentHash,result.contentHash);
});
test('unpublish, Trash and slug changes produce complete new release inventories',async()=>{
 const source=fixture(); const before=await projectPublished(source,async()=>bytes);
 source.tables.ec_posts[0].status='draft';source.tables.ec_services[0].deleted_at='2026-04-01';source.tables.ec_infopages[0].slug='renamed';
 const after=await projectPublished(source,async()=>bytes);
 assert.equal(Object.keys(after.release.collections.posts).length,0);
 assert.equal(Object.keys(after.release.collections.services).length,0);
 assert.deepEqual(Object.keys(after.release.collections.infopages),['renamed']);assert.notEqual(before.contentHash,after.contentHash);
});
test('published referenced media is complete and verified; draft-only uploads stay private',async()=>{
 const source=fixture(); const media={id:'public-image',storage_key:'private-storage-path',mime_type:'image/jpeg',size:bytes.length,content_hash:sha256(bytes),width:1200,height:800,alt:'Published alt',caption:'Published caption',focal_x:0.3,focal_y:0.7};
 source.tables.media=[media,{...media,id:'private-unused-image'}];source.tables.ec_posts[0].featured_image={id:media.id,provider:'local',meta:{storageKey:media.storage_key}};
 const result=await projectPublished(source,async()=>bytes);
 assert.deepEqual(Object.keys(result.release.media),['public-image']);assert.equal(result.assets.size,1);assert.equal(result.release.media[media.id].focalX,0.3);
 await assert.rejects(projectPublished(source,async()=>Buffer.from('changed')),/Media size|checksum/);
 source.tables.ec_posts[0].featured_image=null;source.tables.ec_posts[0].content.push({_type:'image',asset:{_ref:'missing'}});
 await assert.rejects(projectPublished(source,async()=>bytes),/missing media/);
});
test('fail closed on incomplete snapshots, missing prices, invalid slugs and preview tokens',async()=>{
 for (const modify of [s=>delete s.tables.ec_posts,s=>s.tables.ec_pricing[0].status='draft',s=>s.tables.ec_posts[0].slug='../escape',s=>s.tables.ec_posts[0].content[0].markDefs[0].href='/?_preview=private']) {
  const source=fixture();modify(source);await assert.rejects(projectPublished(source,async()=>bytes));
 }
});
test('supported legacy SHA1 checksum and checksum failures',()=>{
 const hash=createHash("sha1").update(bytes).digest("hex");
 assert.equal(verifyMedia(bytes,`sha1:${hash}`,bytes.length),sha256(bytes));
 assert.throws(()=>verifyMedia(bytes,"sha256:bad",bytes.length),/checksum/);
});
