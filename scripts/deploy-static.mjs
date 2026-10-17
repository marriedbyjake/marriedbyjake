import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {buildSource} from './lib/build-source.mjs';
import {verifyPublished} from './verify-published.mjs';
import {guardedDeployment} from './lib/deployment-gate.mjs';
import {prepareDeploymentConfig} from './lib/deployment-config.mjs';
import {releaseVersion,awaitBackendRelease,claimDeployment} from './lib/version-release.mjs';
import {wranglerReleaseTools} from './lib/wrangler-release.mjs';

const target=process.argv[2]||'cms';
if(!['cms','public'].includes(target))throw Error('Unknown release target');
const source=buildSource({strict:true});
if(process.env.PUBLISHING_DEPLOY_APPROVED!=='true')throw Error('Owner-approved CI deployment configuration is required');
const reviewed=JSON.parse(await readFile(target==='cms'?'wrangler.jsonc':'wrangler.public.jsonc','utf8'));
if(process.env.CLOUDFLARE_ACCOUNT_ID!==reviewed.account_id)throw Error('CI account differs from the reviewed Worker configuration');
if(!process.env.CLOUDFLARE_API_TOKEN||!process.env.PUBLISHING_BUILD_SECRET)throw Error('Missing owner-controlled Builds credentials or dedicated build-lock secret');
const manifest=await verifyPublished();
const expected=JSON.parse(await readFile('dist/client/release.json','utf8'));
if(expected.sourceCommit!==source.commit||expected.contentHash!==manifest.contentHash)throw Error('Build output is stale or from a different commit');
let config;
if(target==='cms'){
 await prepareDeploymentConfig(reviewed);
 config='dist/server/wrangler.json';
}else{
 config='.emdash/public-delivery/wrangler.json';
 const packaged=JSON.parse(await readFile('.emdash/public-delivery/manifest.json','utf8'));
 const actual=JSON.parse(await readFile(config,'utf8'));
 if(packaged.sourceCommit!==source.commit||packaged.contentHash!==manifest.contentHash||packaged.workerBytes>32768||actual.name!==reviewed.name||actual.routes.length||JSON.stringify(actual.services)!==JSON.stringify(reviewed.services))throw Error('Public package differs from reviewed source or bindings');
 const worker=await readFile('.emdash/public-delivery/server/worker.mjs');
 if(worker.length!==packaged.workerBytes||createHash('sha256').update(worker).digest('hex')!==packaged.workerSha256||actual.main!=='server/worker.mjs'||actual.base_dir!=='server'||actual.find_additional_modules!==false||actual.no_bundle!==true||actual.assets.directory!=='../../dist/client')throw Error('Public script/package integrity check failed');
 if(Object.keys(actual).some(key=>!['$schema','name','account_id','main','compatibility_date','assets','services','workers_dev','preview_urls','routes','observability','base_dir','no_bundle','find_additional_modules'].includes(key)))throw Error('Unexpected public Worker configuration');
}
const json=async url=>{
 const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 MarriedByJakeRelease'},cache:'no-store',signal:AbortSignal.timeout(20_000)});
 if(!response.ok)throw Error(`Release unavailable (${response.status})`);
 return response.json();
};
const head=async()=>{
 const value=execFileSync('git',['ls-remote','https://github.com/marriedbyjake/marriedbyjake.git','refs/heads/main'],{encoding:'utf8',timeout:20_000}).trim().split(/\s+/)[0];
 if(!/^[a-f0-9]{40}$/.test(value))throw Error('Cannot verify current Git main');return value;
};
const backend='https://marriedbyjake.withersco.workers.dev';
// Wait outside the shared deployment lease: the CMS build needs that lease to
// become ready. Both Builds keep their Cloudflare-provided Worker identity.
if(target==='public')await awaitBackendRelease({expected,read:()=>json(backend+'/release.json'),head});
const gate=async body=>{
 const response=await fetch(backend+'/_publishing/deployment',{method:'POST',headers:{Authorization:`Bearer ${process.env.PUBLISHING_BUILD_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000)});
 if(!response.ok){const error=Error(`Deployment gate unavailable (${response.status}); existing public release retained`);error.status=response.status;throw error;}
 return response.status===204?undefined:response.json();
};
let lease;
const claim=async()=>{
 const {leaseId}=await claimDeployment({commit:source.commit,head,claim:()=>gate({action:'claim',commit:source.commit})});
 const act=action=>gate({action,commit:source.commit,leaseId});
 lease={state:{},save:()=>act('renew'),assert:()=>act('renew'),release:()=>act('release')};return lease;
};
const tools=await wranglerReleaseTools({config,workerName:reviewed.name,commit:source.commit});
const base=target==='cms'?backend:'https://marriedbyjake-public.withersco.workers.dev';
const healthy=async()=>{
 const release=await json(base+'/release.json');
 if(release.sourceCommit!==source.commit||release.contentHash!==manifest.contentHash)throw Error('Live release identity mismatch');
 for(const path of ['/','/weddingtestimonials?page=2','/search.json','/rss.xml','/sitemap-index.xml']){
  const response=await fetch(base+path,{headers:{'User-Agent':'Mozilla/5.0 MarriedByJakeRelease'},signal:AbortSignal.timeout(20_000)});
  if(!response.ok)throw Error(`Live release smoke check failed (${response.status})`);await response.body?.cancel();
 }
 const cms=await fetch(backend+'/_emdash/admin',{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0 MarriedByJakeRelease'},signal:AbortSignal.timeout(20_000)});
 if(![302,303].includes(cms.status))throw Error('CMS sign-in protection check failed');await cms.body?.cancel();
};
await guardedDeployment({claim,commit:source.commit,head,deploy:async signal=>{
 if(target==='public'){
  const current=await json(backend+'/release.json');
  if(current.sourceCommit!==source.commit||current.contentHash!==manifest.contentHash)throw Error('CMS changed before public deployment');
 }
 await releaseVersion({commit:source.commit,head,...tools,healthy,assertLease:()=>lease.assert(),signal});
}});
