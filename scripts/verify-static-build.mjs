import fs from 'node:fs/promises';
import path from 'node:path';
import manifest from '../content/published/manifest.json' with {type:'json'};
import {inspectWorkerStartup} from './lib/worker-startup.mjs';
import {isUnlistedPage} from '../src/lib/page-discovery.mjs';
const root='dist/client';
const search=JSON.parse(await fs.readFile(path.join(root,'search.json'),'utf8'));
const searchTargets=[];
for(const name of ['posts','services','weddingtestimonials','infopages']){
 const {entries}=JSON.parse(await fs.readFile(`content/published/${name}.json`,'utf8'));
 for(const slug of Object.keys(entries)){const url=`${name==='posts'?'/blog':name==='weddingtestimonials'?'/weddingtestimonials':''}/${slug}`;if(!isUnlistedPage(url))searchTargets.push(url);}
}
if(!Array.isArray(search.items)||JSON.stringify(search.items.map(item=>item.url).sort())!==JSON.stringify(searchTargets.sort()))throw Error('Static search does not contain exactly the published entries');
const feed=await fs.readFile(path.join(root,'rss.xml'),'utf8');
if((feed.match(/<item>/g)||[]).length!==manifest.counts.posts)throw Error('Static RSS is incomplete');
const directory=await fs.readFile(path.join(root,'weddingtestimonials.html'),'utf8');
if(directory.includes('Please add PUBLIC_GOOGLE_MAPS_API_KEY'))throw Error('The existing Maps build value is required before release');
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const sitemap=await fs.readFile(path.join(root,'sitemap-0.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>decode(match[1]));
if(!urls.length||new Set(urls).size!==urls.length)throw Error('Empty or duplicate sitemap');
if(urls.some(isUnlistedPage))throw Error('An unlisted pricing page entered the sitemap');
const pricing=await fs.readFile(path.join(root,'serviceandprice.html'),'utf8');
if(!/<meta name="robots" content="noindex/.test(pricing))throw Error('Direct-link pricing must stay noindex');
if(await fs.access(path.join(root,'celebrantcost.html')).then(()=>true,()=>false))throw Error('The historical cost article must redirect instead of shipping another pricing page');
for(const file of await fs.readdir(root,{recursive:true})){
 if(!file.endsWith('.html')||file==='serviceandprice.html')continue;
 const html=await fs.readFile(path.join(root,file),'utf8');
 if([...html.matchAll(/\bhref=(["'])(.*?)\1/gi)].some(match=>isUnlistedPage(decode(match[2]))))throw Error('An unlisted pricing link entered '+file);
 const visible=decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,' '));
 // Review excerpts can truncate "feel" to "fee…". Full review pages remain
 // checked, so an ellipsis-ending fragment must not be treated as a fee claim.
 if(/\b(?:prices?|pricing|costs?|fees?|GST)\b(?!…)|\$\s*\d/i.test(visible)||/"(?:price|priceRange)"\s*:/.test(html))throw Error('Pricing escaped the direct-link page: '+file);
}
for(const file of ['search.json','llms.txt','llms-full.txt']){
 const text=await fs.readFile(path.join(root,file),'utf8');
 if(/serviceandprice|celebrantcost|\b(?:prices?|pricing|costs?|fees?|GST)\b|\$\s*\d/i.test(text))throw Error('Pricing entered a discovery feed: '+file);
}
for(const value of urls){
 const url=new URL(value);const page=url.searchParams.get('page');
 const file=page?`__published/testimonial-pages/${page}.html`:url.pathname==='/'?'index.html':`${url.pathname.slice(1)}.html`;
 const html=await fs.readFile(path.join(root,file),'utf8');
 const canonical=html.match(/<link rel="canonical" href="([^"]+)"/);
 if(!canonical||decode(canonical[1])!==value)throw Error(`Incorrect static canonical: ${url.pathname}${url.search}`);
 if(/(?:[?&]|&amp;)_preview=/.test(html))throw Error('A private preview reference entered static HTML');
 if(/\bsrc="[^"]*\/_emdash\/api\/media\/file\//.test(html))throw Error('Static public HTML depends on mutable CMS media');
}
const reviews=(await fs.readdir(path.join(root,'weddingtestimonials'))).filter(name=>name.endsWith('.html')).length;
const expectedPages=Math.ceil(manifest.counts.weddingtestimonials/24)-1;
const pages=(await fs.readdir(path.join(root,'__published/testimonial-pages'))).filter(name=>name.endsWith('.html')).length;
if(reviews!==manifest.counts.weddingtestimonials||pages!==expectedPages)throw Error('Incomplete review or pagination output');
const files=await fs.readdir('dist/server/chunks');
const entrypoints=(await Promise.all(files.filter(name=>/^entrypoints_.*\.mjs$/.test(name)).map(name=>fs.readFile(path.join('dist/server/chunks',name),'utf8')))).join('');
if(!entrypoints.includes('_preview/[collection]/[id]'))throw Error('The signed preview route is not registered');
const release=JSON.parse(await fs.readFile(path.join(root,'release.json'),'utf8'));
if(release.contentHash!==manifest.contentHash)throw Error('Static release content hash differs from Git snapshot');
const startup=await inspectWorkerStartup();
if(startup.bytes>32_768||!startup.deferred.some(file=>/^chunks\/cms-worker_[^/]+\.mjs$/.test(file)))throw Error('The public Worker entry must stay below 32 KiB with the CMS in a deferred module');
console.log(JSON.stringify({verified:true,searchItems:search.items.length,rssItems:manifest.counts.posts,sitemapURLs:urls.length,staticReviews:reviews,paginationPages:pages,privatePreviewRegistered:true,publicStartupBytes:startup.bytes,publicStartupModules:startup.files.length,contentHash:release.contentHash,sourceCommit:release.sourceCommit}));
