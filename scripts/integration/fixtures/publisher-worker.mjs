import {runPublisher} from '../../../src/publishing/publisher.mjs';
import {readPublishingState} from '../../../src/publishing/ledger.mjs';
import {gitBlobHash,managedPath} from '../../../src/publishing/github.mjs';
import {sha256,json} from '../../lib/published-content.mjs';
import {Buffer} from 'node:buffer';
const get=async(env,key)=>{const object=await env.MEDIA.get(`__test/${key}`);return object?object.json():undefined;};
const put=(env,key,value)=>env.MEDIA.put(`__test/${key}`,JSON.stringify(value));
async function remote(request,init,env,scenario){
 const url=new URL(request);const pathname=url.pathname;const method=init?.method||'GET';
 let calls=await get(env,'calls')||[];calls.push({pathname,method});await put(env,'calls',calls);
 if(scenario==='network-error')return Response.json({error:'synthetic failure'},{status:503});
 if(url.hostname==='marriedbyjake.com'){const live=await get(env,'live');return Response.json(live||{}, {status:live?200:404});}
 if(url.hostname!=='api.github.com')throw Error('Tests forbid external network');
 const base=await get(env,'base');
 if(pathname.endsWith('/access_tokens'))return Response.json({token:'synthetic-token',permissions:{contents:'write'},repositories:[{id:1104160905,full_name:'marriedbyjake/marriedbyjake'}],expires_at:new Date(Date.now()+3600_000).toISOString()});
 if(pathname.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:(await get(env,'head'))||base.head}});
 if(pathname==='/repos/marriedbyjake/marriedbyjake')return Response.json({id:1104160905,full_name:'marriedbyjake/marriedbyjake',node_id:'synthetic-repository-node'});
 if(method==='GET'&&pathname.includes('/compare/')){
  const [ancestor,head]=pathname.split('/').at(-1).split('...');const queue=[head],seen=new Set();let found=false;
  while(queue.length&&seen.size<100){const sha=queue.shift();if(sha===ancestor){found=true;break;}if(seen.has(sha))continue;seen.add(sha);const commit=await get(env,`commit/${sha}`);queue.push(...(commit?.parents||[]).map(parent=>typeof parent==='string'?parent:parent.sha));}
  return Response.json({status:found?'ahead':'diverged',behind_by:found?0:1,ahead_by:1,base_commit:{sha:ancestor},merge_base_commit:{sha:found?ancestor:base.head}});
 }
 if(method==='GET'&&pathname.includes('/git/commits/')){const commit=pathname.split('/').at(-1);return Response.json(await get(env,`commit/${commit}`));}
 if(method==='GET'&&pathname.includes('/git/trees/')){const tree=await get(env,`tree/${pathname.split('/').at(-1)}`);return Response.json({truncated:false,tree:Object.entries(tree).map(([path,sha])=>({path,sha,type:'blob',mode:'100644'}))});}
 if(method==='GET'&&pathname.includes('/git/blobs/')){const object=await env.MEDIA.get(`__test/blob/${pathname.split('/').at(-1)}`);const bytes=Buffer.from(await object.arrayBuffer());return Response.json({encoding:'base64',content:bytes.toString('base64'),size:bytes.length});}
 const body=init?.body?JSON.parse(init.body):{};
 if(method==='POST'&&pathname.endsWith('/git/blobs')){
  const bytes=Buffer.from(body.content,'base64');const sha=gitBlobHash(bytes);await env.MEDIA.put(`__test/blob/${sha}`,bytes);
  if(scenario==='cms-race'){await env.DB.prepare("UPDATE ec_posts SET live_revision_id='racing-revision',title='Newer CMS publication' WHERE id='posts-id'").run();}
  return Response.json({sha});
 }
 if(method==='POST'&&pathname.endsWith('/git/trees')){
  const tree={...await get(env,`tree/${body.base_tree}`)};
  for(const item of body.tree){if(!managedPath(item.path))throw Error('Unapproved path');if(item.sha===null)delete tree[item.path];else tree[item.path]=item.sha;}
  const sha=gitBlobHash(Buffer.from(json(tree)));await put(env,`tree/${sha}`,tree);return Response.json({sha});
 }
 if(method==='POST'&&pathname.endsWith('/git/commits')){const sha=gitBlobHash(Buffer.from(json(body)));await put(env,`commit/${sha}`,{...body,tree:{sha:body.tree}});return Response.json({sha});}
 if(pathname==='/graphql'){
  const update=body.variables.input.refUpdates[0];if(update.force||update.name!=='refs/heads/main')throw Error('Unsafe ref update');
  if(scenario==='git-race')await put(env,'head','d'.repeat(40));
  const current=await get(env,'head')||base.head;
  if(current!==update.beforeOid)return Response.json({errors:[{message:'Synthetic compare-and-swap failure'}]});
  await put(env,'head',update.afterOid);return Response.json({data:{updateRefs:{clientMutationId:null}}});
 }
 throw Error(`Unhandled fixture API ${method} ${pathname}`);
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==='/state')return Response.json(await readPublishingState(env.DB));
 const result=await runPublisher({...env,PUBLISHING_ENABLED:url.pathname==='/disabled'?'false':'true'}, {fetcher:(input,init)=>remote(input,init,env,url.searchParams.get('scenario'))});
 return Response.json(result);
}};
