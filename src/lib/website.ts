import {getEntry} from './cms';
import {getRequestContext,getEmDashEntry} from 'emdash';
import services from '../../content/published/services.json';
import infoPages from '../../content/published/infopages.json';
import defaults from '../data/website-defaults.json';
import menuDefaults from '../data/menu-defaults.json';
import shared from '../../content/published/shared.json';
import manifest from '../../content/published/manifest.json';
import {committedImage} from './published-media';
import {validateWebsiteEntry} from '../../scripts/lib/website-model.mjs';
import type {ImageMetadata} from 'astro';

export type WebsiteSection = keyof typeof defaults;
// Drafts are read only for the one section named in a verified signed preview.
export async function websiteSection(slug: WebsiteSection): Promise<any> {
 const preview=getRequestContext()?.preview;
 if(preview?.collection==='website') {
  const {entry,error}=await getEmDashEntry('website',preview.id);
  if(error)throw Error('Website preview unavailable');
  if(entry?.id===slug) return validateWebsiteEntry(slug,entry.data);
 }
 if(!Object.hasOwn(manifest.counts,'website'))return defaults[slug].content[0];
 const entry=await getEntry('website',slug);
 if(!entry)throw Error(`Required website section is unavailable: ${slug}`);
 return validateWebsiteEntry(slug,entry.data);
}
export function websiteImage(source:any,fallback:ImageMetadata) {
 if(!source?.id)return {image:fallback,alt:undefined};
 if(getRequestContext()?.preview?.collection==='website')return {image:{src:source.src||`/_emdash/api/media/file/${encodeURIComponent(source.meta?.storageKey||source.id)}`,width:source.width||1200,height:source.height||800,format:source.mimeType?.split('/')[1]?.replace('jpeg','jpg')||'jpg'} as ImageMetadata,alt:source.alt};
 const {image,item}=committedImage(source.id);return {image,alt:source.alt||item.alt};
}
export function websiteMenu(name:keyof typeof menuDefaults) {
 const menu=(shared.menus as any[]).find(menu=>menu.name===name);
 if(!menu){if(Object.hasOwn(manifest.counts,'website'))throw Error(`Required menu is missing: ${name}`);return menuDefaults[name].items;}
 const items=(shared.menuItems as any[]).filter(item=>item.menu_id===menu.id);
 const flatten=(parent:string|null,depth=0):any[]=>items.filter(item=>item.parent_id===parent).sort((a,b)=>a.sort_order-b.sort_order||a.id.localeCompare(b.id)).flatMap(item=>[{label:item.label,href:item.href,target:item.target||undefined,depth},...flatten(item.id,depth+1)]);
 return flatten(null);
}
export const siteSettings=shared.settings as Record<string,any>;
export async function pageSearch(path:string) {
 const match=Object.keys(defaults).find(slug=>slug.startsWith('seo-')&&(defaults as any)[slug].content[0].path===path);
 return match ? websiteSection(match as WebsiteSection) : undefined;
}
export async function contentSearch(path:string) {
 if(path==='/serviceandprice')return (await getEntry('pricing','index'))?.data;
 const [collection,slug]=path.startsWith('/blog/')?['posts',path.slice(6)]:path.startsWith('/weddingtestimonials/')?['weddingtestimonials',path.slice(21)]:['',path.slice(1)];
 if(!slug)return undefined;
 const entry=collection ? await getEntry(collection as 'posts'|'weddingtestimonials',slug) : Object.hasOwn(services.entries,slug) ? await getEntry('services',slug) : Object.hasOwn(infoPages.entries,slug) ? await getEntry('infopages',slug) : undefined;
 return entry?.data;
}
