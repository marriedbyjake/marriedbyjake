// Additive, idempotent native EmDash setup. Existing entries are never rewritten.
// Use only a privately stored existing editor session; never commit its file.
import fs from 'node:fs/promises';
import {websiteBlockTypes,websiteCollection,websiteFields,publishedSeoFields,websiteDefaults,validateWebsiteEntry} from './lib/website-model.mjs';
import menus from '../src/data/menu-defaults.json' with {type:'json'};
import {digest,legacyCollectionNames} from './lib/published-content.mjs';
const apply=process.argv.includes('--apply');
for(const[slug,data]of Object.entries(websiteDefaults))validateWebsiteEntry(slug,data);
if(!apply){console.log(JSON.stringify({dryRun:true,blockTypes:Object.keys(websiteBlockTypes).length,sections:Object.keys(websiteDefaults).length,menus:Object.keys(menus).length,seoFields:publishedSeoFields.length,existingCollections:legacyCollectionNames,preservesExistingEntries:true}));process.exit(0);}
const cookieFile=process.env.EMDASH_SESSION_FILE;
if(!cookieFile)throw Error('Set EMDASH_SESSION_FILE to a private existing browser-session file');
const cookie=(await fs.readFile(cookieFile,'utf8')).trim();
const origin='https://marriedbyjake.com';
async function api(path,method='GET',body){
 const response=await fetch(origin+'/_emdash/api'+path,{method,redirect:'error',headers:{Cookie:cookie,Origin:origin,'X-EmDash-Request':'1','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const payload=await response.json();if(!response.ok||payload.success!==true)throw Error(`${method} ${path}: ${payload.error?.code||response.status} ${payload.error?.message||'Native API refused request'}`);return payload.data;
}
const collectionList=(await api('/schema/collections?includeFields=true')).items;
const blockList=(await api('/schema/block-types')).items;
for(const[slug,definition]of Object.entries(websiteBlockTypes)){
 const existing=blockList.find(item=>item.slug===slug);
 if(existing){const detail=await api('/schema/block-types/'+slug);const actual=detail.item||detail;const fields=actual.fields||actual.versions?.find(version=>version.version===actual.currentVersion)?.fields;if(digest(fields)!==digest(definition.fields))throw Error('Existing block definition needs manual review: '+slug);}
 else await api('/schema/block-types','POST',{slug,...definition});
}
if(!collectionList.some(item=>item.slug==='website'))await api('/schema/collections','POST',websiteCollection);
let website=await api('/schema/collections/website?includeFields=true');website=website.item||website.collection||website;
for(const field of websiteFields)if(!website.fields?.some(item=>item.slug===field.slug))await api('/schema/collections/website/fields','POST',field);
await api('/schema/collections/website','PUT',{titleField:'title'});
for(const name of legacyCollectionNames){
 let detail=await api('/schema/collections/'+name+'?includeFields=true');detail=detail.item||detail.collection||detail;
 for(const field of name === 'readings' ? [] : publishedSeoFields)if(!detail.fields?.some(item=>item.slug===field.slug))await api('/schema/collections/'+name+'/fields','POST',field);
 // Only retire the unused side panel after the revision-managed replacements exist.
 await api('/schema/collections/'+name,'PUT',{hasSeo:false,supports:detail.supports.filter(value=>value!=='seo'),...(name==='weddingtestimonials'?{admin:{...detail.admin,listColumns:['venue']}}:{})});
}
const existing=(await api('/content/website?limit=100&locale=en')).items;
for(const[slug,entry]of Object.entries(websiteDefaults)){
 if(existing.some(item=>item.slug===slug))continue;
 const created=await api('/content/website','POST',{slug,data:{title:entry.title,content:entry.content},locale:'en'});
 const item=created.item||created;await api(`/content/website/${item.id}/publish`,'POST',{});
}
const menuResult=await api('/menus?locale=en');
const menuList=Array.isArray(menuResult)?menuResult:menuResult.items;
for(const[name,definition]of Object.entries(menus)){
 let menu=menuList.find(item=>item.name===name);if(!menu){const created=await api('/menus','POST',{name,label:definition.label,locale:'en'});menu=created.item||created.menu||created;}
 const detail=await api('/menus/'+name+'?locale=en'),items=detail.items||detail.item?.items||[];
 // Re-run only fills a partially completed setup, preserving owner edits/order.
 if(items.length&&!items.every(item=>definition.items.some(value=>value.label===item.label&&value.href===item.customUrl)))throw Error('Existing menu needs manual review: '+name);
 for(const[index,item]of definition.items.entries())if(!items.some(existing=>existing.label===item.label&&existing.customUrl===item.href))await api('/menus/'+name+'/items?locale=en','POST',{type:'custom',label:item.label,customUrl:item.href,sortOrder:index});
}
console.log(JSON.stringify({configured:true,sections:Object.keys(websiteDefaults).length,menus:Object.keys(menus).length,existingEntriesRewritten:0}));
