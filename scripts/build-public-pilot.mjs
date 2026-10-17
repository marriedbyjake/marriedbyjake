import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {buildSource} from './lib/build-source.mjs';
import {verifyPublished} from './verify-published.mjs';
import {sha256} from './lib/published-content.mjs';

// Packaging only. Provisioning this separate Worker requires explicit approval.
const source=buildSource();
if(!source.commit)throw Error('Build the pilot from a clean committed checkout');
const manifest=await verifyPublished();
const release=JSON.parse(await fs.readFile('dist/client/release.json','utf8'));
if(release.sourceCommit!==source.commit||release.contentHash!==manifest.contentHash)throw Error('Run npm run build from this exact clean commit before packaging the pilot');
const production=JSON.parse(await fs.readFile('wrangler.jsonc','utf8'));
const bundle=await build({entryPoints:['src/public-pilot-worker.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',minify:true,metafile:true});
if(Object.values(bundle.metafile.outputs).some(output=>output.imports.length))throw Error('The pilot must be one self-contained module');
if(Object.keys(bundle.metafile.inputs).some(file=>!['src/public-pilot-worker.ts','src/lib/published-routing.ts','src/data/redirects.json','content/published/shared.json','content/published/manifest.json'].includes(file)))throw Error('Unexpected dependency in public-only pilot');
const worker=bundle.outputFiles[0].contents;
if(worker.byteLength>32768)throw Error('Pilot exceeds the 32 KiB complete-upload budget');
const directory=path.resolve('.emdash/public-pilot');
try{
 await fs.access(directory);
 const previous=JSON.parse(await fs.readFile(path.join(directory,'pilot-manifest.json'),'utf8'));
 if(previous.workerName!=='marriedbyjake-public-pilot'||previous.privateBackendConnected!==false)throw Error('Refusing to replace an unknown pilot output directory');
}catch(error){if(error.code!=='ENOENT')throw error;else if(await fs.stat(directory).catch(()=>undefined))throw Error('Refusing to replace an unrecognized existing directory');}
await fs.rm(directory,{recursive:true,force:true});
await fs.mkdir(path.join(directory,'server'),{recursive:true});
await fs.cp('dist/client',path.join(directory,'client'),{recursive:true});
await fs.writeFile(path.join(directory,'server/worker.mjs'),worker);
const config={
 name:'marriedbyjake-public-pilot',account_id:production.account_id,main:'server/worker.mjs',base_dir:'server',
 compatibility_date:production.compatibility_date,no_bundle:true,find_additional_modules:false,
 assets:{directory:'client',binding:'ASSETS',run_worker_first:true,html_handling:'none',not_found_handling:'404-page'},
 workers_dev:true,preview_urls:false,routes:[],
 observability:{enabled:true,head_sampling_rate:1,redact_query_string:true},
};
await fs.writeFile(path.join(directory,'wrangler.json'),JSON.stringify(config,null,2)+'\n');
const evidence={sourceCommit:source.commit,contentHash:manifest.contentHash,workerBytes:worker.byteLength,workerSha256:sha256(worker),workerInputs:Object.keys(bundle.metafile.inputs).sort(),workerName:config.name,accountId:config.account_id,bindings:['ASSETS'],productionRoutes:[],privateBackendConnected:false};
await fs.writeFile(path.join(directory,'pilot-manifest.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({prepared:true,...evidence}));
