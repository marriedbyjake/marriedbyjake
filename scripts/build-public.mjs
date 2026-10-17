import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {buildSource} from './lib/build-source.mjs';
import {verifyPublished} from './verify-published.mjs';
import {sha256} from './lib/published-content.mjs';

const source=buildSource();
const snapshot=await verifyPublished();
const release=JSON.parse(await fs.readFile('dist/client/release.json','utf8'));
if(release.sourceCommit!==source.commit||release.contentHash!==snapshot.contentHash)throw Error('Public output differs from the exact source/snapshot');
const reviewed=JSON.parse(await fs.readFile('workers/public/wrangler.jsonc','utf8'));
const allowed=['src/public-worker.ts','src/lib/published-routing.ts','src/data/redirects.json','content/published/shared.json','content/published/manifest.json'];
const bundle=await build({entryPoints:['src/public-worker.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,metafile:true});
if(Object.keys(bundle.metafile.inputs).some(file=>!allowed.includes(file))||Object.values(bundle.metafile.outputs).some(output=>output.imports.length))throw Error('Unexpected public Worker dependency');
const worker=bundle.outputFiles[0].contents;
if(worker.byteLength>32768)throw Error('Complete public Worker exceeds 32 KiB');
if(reviewed.name!=='marriedbyjake-public'||reviewed.account_id!=='60ef6bd2c48d5beb6fd6a093cff863cf'||JSON.stringify(reviewed.services)!==JSON.stringify([{binding:'CMS',service:'marriedbyjake'}]))throw Error('Unexpected public resource or private service');
const directory=path.resolve('.emdash/public-delivery');
await fs.mkdir(path.join(directory,'server'),{recursive:true});
await fs.writeFile(path.join(directory,'server/worker.mjs'),worker);
// Explicit paths keep no-bundle module discovery away from HTML assets.
// Routes are activated independently after live checks; routine builds never
// move traffic away from an operator-selected rollback target.
const config={...reviewed,main:'server/worker.mjs',base_dir:'server',no_bundle:true,find_additional_modules:false,routes:[],assets:{...reviewed.assets,directory:'../../dist/client'}};
await fs.writeFile(path.join(directory,'wrangler.json'),JSON.stringify(config,null,2)+'\n');
const evidence={...release,workerName:reviewed.name,workerBytes:worker.byteLength,workerSha256:sha256(worker),workerInputs:Object.keys(bundle.metafile.inputs).sort(),bindings:['ASSETS','CMS'],services:reviewed.services,productionRoutesManagedByBuild:false};
await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({prepared:true,...evidence}));
