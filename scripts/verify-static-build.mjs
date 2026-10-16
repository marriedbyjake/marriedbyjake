import fs from 'node:fs/promises';
import path from 'node:path';
import manifest from '../content/published/manifest.json' with {type:'json'};
const root='dist/client';
const decode=value=>value.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&apos;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
const sitemap=await fs.readFile(path.join(root,'sitemap-0.xml'),'utf8');
const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>decode(match[1]));
if(!urls.length||new Set(urls).size!==urls.length)throw Error('Empty or duplicate sitemap');
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
console.log(JSON.stringify({verified:true,sitemapURLs:urls.length,staticReviews:reviews,paginationPages:pages,privatePreviewRegistered:true,contentHash:release.contentHash,sourceCommit:release.sourceCommit}));
