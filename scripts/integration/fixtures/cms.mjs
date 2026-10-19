import {websiteDefaults} from '../../lib/website-model.mjs';
import {collections} from '../../lib/published-content.mjs';
export function schemaSql(){
 const tables={
  options:['name TEXT PRIMARY KEY','value TEXT','revision INTEGER DEFAULT 0'],
  revisions:['id TEXT PRIMARY KEY','created_at TEXT'],
  media:['id TEXT PRIMARY KEY','filename TEXT','mime_type TEXT','size INTEGER','width INTEGER','height INTEGER','alt TEXT','caption TEXT','storage_key TEXT','content_hash TEXT','focal_x REAL','focal_y REAL','blurhash TEXT','dominant_color TEXT'],
  _emdash_menus:['id TEXT','name TEXT','label TEXT','locale TEXT'],
  _emdash_menu_items:['id TEXT','menu_id TEXT','parent_id TEXT','sort_order INTEGER','type TEXT','reference_collection TEXT','reference_id TEXT','custom_url TEXT','label TEXT','title_attr TEXT','target TEXT','css_classes TEXT','locale TEXT'],
  taxonomies:['id TEXT','name TEXT','slug TEXT','label TEXT','parent_id TEXT','data TEXT','locale TEXT','translation_group TEXT','sort_order INTEGER'],
  content_taxonomies:['collection TEXT','entry_id TEXT','taxonomy_id TEXT','status TEXT','deleted_at TEXT'],
  _emdash_redirects:['source TEXT','destination TEXT','type TEXT','is_pattern INTEGER','enabled INTEGER'],
 };
 for(const [name,fields] of Object.entries(collections))tables[`ec_${name}`]=['id TEXT PRIMARY KEY','slug TEXT','status TEXT','deleted_at TEXT','created_at TEXT','published_at TEXT','live_revision_id TEXT','translation_group TEXT',...fields.map(field=>`"${field}" ${['featured','rating','latitude','longitude','order'].includes(field)?'REAL':'TEXT'}`)];
 return Object.entries(tables).map(([name,columns])=>`CREATE TABLE "${name}"(${columns.join(',')});`).join('\n');
}
export function fixtureRows(){
 const rows={};
 for(const [name,fields] of Object.entries(collections)){
  const data=Object.fromEntries(fields.map(field=>[field,null]));
  if(name!=='pricing')data.content=JSON.stringify([{_key:'p',_type:'block',style:'normal',markDefs:[],children:[{_key:'s',_type:'span',marks:[],text:'Synthetic published words.'}]}]);
  if(name==='posts'){data.title='Synthetic post';data.pub_date='2026-01-01T00:00:00Z';data.description='Synthetic description';data.tags='[]';}
  if(name==='pricing')for(const key of fields.filter(key=>!['search_title','search_description','social_image','preferred_url','hide_from_search'].includes(key)))data[key]='Synthetic price';
  rows[`ec_${name}`]=[{id:`${name}-id`,slug:name==='pricing'?'index':'synthetic-entry',status:'published',deleted_at:null,created_at:'2026-01-01T00:00:00Z',published_at:'2026-01-01T00:00:00Z',live_revision_id:`${name}-rev`,...data}];
 }
 rows.ec_website=Object.entries(websiteDefaults).map(([slug,entry])=>({...rows.ec_website[0],id:slug+'-id',slug,title:entry.title,content:JSON.stringify(entry.content)}));
 rows.ec_posts.push({...rows.ec_posts[0],id:'private-draft-id',slug:'private-draft',status:'draft',title:'PRIVATE-SYNTHETIC-DRAFT'});
 rows.revisions=Object.keys(collections).map(name=>({id:`${name}-rev`,created_at:'2026-01-02T00:00:00Z'}));
 return rows;
}
export async function seed(db){
 await db.exec(schemaSql().replaceAll('\n',' '));
 for(const [name,rows] of Object.entries(fixtureRows()))for(const row of rows){
  const fields=Object.keys(row);await db.prepare(`INSERT INTO "${name}"(${fields.map(field=>`"${field}"`).join(',')}) VALUES(${fields.map(()=>'?').join(',')})`).bind(...Object.values(row)).run();
 }
}
