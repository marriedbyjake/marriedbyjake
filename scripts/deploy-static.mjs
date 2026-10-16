import {readFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {buildSource} from './lib/build-source.mjs';
import {verifyPublished} from './verify-published.mjs';
import {guardedDeployment} from './lib/deployment-gate.mjs';
const source=buildSource({strict:true});
if(process.env.PUBLISHING_DEPLOY_APPROVED!=='true')throw Error('Owner-approved CI deployment configuration is required');
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(process.env.CLOUDFLARE_ACCOUNT_ID!==config.account_id)throw Error('CI account differs from the reviewed Worker configuration');
if(!process.env.CLOUDFLARE_API_TOKEN)throw Error('Use owner-controlled Cloudflare Builds credentials');
const manifest=await verifyPublished();
const release=JSON.parse(await readFile('dist/client/release.json','utf8'));
if(release.sourceCommit!==source.commit||release.contentHash!==manifest.contentHash)throw Error('Build output is stale or from a different commit');
if(!process.env.PUBLISHING_BUILD_SECRET)throw Error('Missing dedicated build-lock secret');
const gate=async(body)=>{
 const response=await fetch('https://marriedbyjake.com/_publishing/deployment',{method:'POST',headers:{Authorization:`Bearer ${process.env.PUBLISHING_BUILD_SECRET}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20_000)});
 if(!response.ok)throw Error(`Deployment gate unavailable (${response.status}); retry after checking the active build`);
 return response.status===204?undefined:response.json();
};
const claim=async()=>{
 const {leaseId}=await gate({action:'claim',commit:source.commit});
 const act=action=>gate({action,commit:source.commit,leaseId});
 return {state:{},save:()=>act('renew'),assert:()=>act('renew'),release:()=>act('release')};
};
const head=async()=>{
 const value=execFileSync('git',['ls-remote','https://github.com/marriedbyjake/marriedbyjake.git','refs/heads/main'],{encoding:'utf8',timeout:20_000}).trim().split(/\s+/)[0];
 if(!/^[a-f0-9]{40}$/.test(value))throw Error('Cannot verify current Git main');return value;
};
await guardedDeployment({claim,commit:source.commit,head,deploy:signal=>new Promise((resolve,reject)=>{
 const child=spawn('npx',['wrangler','deploy','--keep-vars','--message',`main ${source.commit}: static published release`],{stdio:'inherit',env:process.env,signal,timeout:240_000});
 child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error('Worker deployment failed; inspect Cloudflare build')));
})});
