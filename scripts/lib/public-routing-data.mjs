import fs from 'node:fs/promises';
// A separate module identity prevents bundlers sharing the CMS's full menus
// and settings chunk with the public entry. Both builders select identical data.
export const publicRedirectSuffix='?public-redirects';
const redirectJson=async file=>JSON.stringify(JSON.parse(await fs.readFile(file,'utf8')).redirects);
export function publicRoutingVite(){return {
 name:'published-public-redirects',enforce:'pre',
 async load(id){if(id.endsWith('/content/published/shared.json'+publicRedirectSuffix))return `export default ${await redirectJson(id.slice(0,-publicRedirectSuffix.length))};`;},
};}
export function publicRoutingEsbuild(){return {
 name:'published-public-redirects',setup(build){build.onLoad({filter:/\/content\/published\/shared\.json$/},async args=>{
  if(args.suffix!==publicRedirectSuffix)return;
  return {contents:await redirectJson(args.path),loader:'json',watchFiles:[args.path]};
 });},
};}
