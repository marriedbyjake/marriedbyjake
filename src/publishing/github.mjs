import {createHash,createSign} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {PublicationConflict} from '../../scripts/lib/publishing-queue.mjs';

const repository='marriedbyjake/marriedbyjake';
const root=`https://api.github.com/repos/${repository}`;
const oid=value=>typeof value==='string'&&/^[a-f0-9]{40}$/.test(value);
export const managedPath=value=>/^content\/published\/[a-z]+\.json$/.test(value)||/^src\/images\/published\/[a-f0-9]{64}\.(?:jpg|png|webp)$/.test(value);
export const gitBlobHash=bytes=>createHash('sha1').update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest('hex');
export class GitHubPublisher {
 constructor(config,fetcher=fetch,guard=async()=>{}){
  this.config=config;
  // Calling the Workers fetch intrinsic as a client method changes its receiver.
  this.fetcher=(...args)=>fetcher(...args);
  this.guard=guard;
 }
 async token(){
  if(this.access&&this.expires>Date.now()+60_000)return this.access;
  const {GITHUB_APP_ID:app,GITHUB_INSTALLATION_ID:installation,GITHUB_REPOSITORY_ID:repo,GITHUB_APP_PRIVATE_KEY:key}=this.config;
  if(!/^\d+$/.test(String(app))||!/^\d+$/.test(String(installation))||!/^\d+$/.test(String(repo))||!key)throw Error('Repository writer is not configured');
  const now=Math.floor(Date.now()/1000);const header=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({iss:String(app),iat:now-60,exp:now+540})).toString('base64url');
  const unsigned=`${header}.${payload}`;const signature=createSign('RSA-SHA256').update(unsigned).sign(key,'base64url');
  const response=await this.fetcher(`https://api.github.com/app/installations/${installation}/access_tokens`,{method:'POST',headers:this.headers(`${unsigned}.${signature}`),body:JSON.stringify({repository_ids:[Number(repo)],permissions:{contents:'write'}}),signal:AbortSignal.timeout(15_000)});
  if(!response.ok)throw Error('GitHub App authentication failed');const result=await response.json();
  if(!result.token||result.permissions?.contents!=='write'||result.repositories?.length!==1||result.repositories[0].id!==Number(repo)||result.repositories[0].full_name.toLowerCase()!==repository)throw Error('GitHub App token is not restricted to the approved repository');
  this.access=result.token;this.expires=Date.parse(result.expires_at);return this.access;
 }
 headers(token){return {'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'marriedbyjake-publisher'};}
 async request(endpoint,method='GET',body){
  if(!endpoint.startsWith(root+'/')&&endpoint!==root&&endpoint!=='https://api.github.com/graphql')throw Error('Unapproved GitHub API target');
  if(method!=='GET')await this.guard();
  const response=await this.fetcher(endpoint,{method,headers:this.headers(await this.token()),...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15_000)});
  if(!response.ok)throw Error(`GitHub publisher request failed (${response.status})`);
  const value=await response.json();if(value.errors)throw new PublicationConflict('Git reference changed or the repository rejected this publication');return value;
 }
 async head(){const result=await this.request(`${root}/git/ref/heads/main`);if(!oid(result.object?.sha))throw Error('Invalid Git main reference');return result.object.sha;}
 async blobJson(sha){
  if(!oid(sha))throw Error('Invalid Git blob');const blob=await this.request(`${root}/git/blobs/${sha}`);
  if(blob.encoding!=='base64'||blob.size>4*1024*1024)throw Error('Invalid or oversized Git release metadata');
  const bytes=Buffer.from(blob.content.replace(/\s/g,''),'base64');if(gitBlobHash(bytes)!==sha)throw Error('Git blob verification failed');return JSON.parse(bytes.toString('utf8'));
 }
 async remote(){
  const head=await this.head();const commit=await this.request(`${root}/git/commits/${head}`);
  const tree=await this.request(`${root}/git/trees/${commit.tree.sha}?recursive=1`);
  if(tree.truncated||!Array.isArray(tree.tree)||tree.tree.length>20_000)throw Error('Incomplete or oversized Git tree');
  const paths=Object.fromEntries(tree.tree.filter(item=>item.type==='blob'&&managedPath(item.path)).map(item=>[item.path,item.sha]));
  const manifest=await this.blobJson(paths['content/published/manifest.json']);
  const media=await this.blobJson(paths['content/published/media.json']);
  const repo=await this.request(root);if(repo.full_name?.toLowerCase()!==repository||repo.id!==Number(this.config.GITHUB_REPOSITORY_ID))throw Error('Unexpected Git repository identity');
  return {head,tree:commit.tree.sha,nodeId:repo.node_id,paths,manifest,media};
 }
 async upload(bytes){
  if(bytes.byteLength>8*1024*1024)throw Error('Published asset exceeds the reviewed 8 MiB per-file limit');
  const result=await this.request(`${root}/git/blobs`,'POST',{content:Buffer.from(bytes).toString('base64'),encoding:'base64'});
  if(result.sha!==gitBlobHash(bytes))throw Error('Uploaded Git blob verification failed');return result.sha;
 }
 async commit(base,paths,contentHash){
  if(Object.keys(paths).some(path=>!managedPath(path)))throw Error('Publication attempted to change an unapproved path');
  const tree=[...Object.entries(paths).map(([path,sha])=>({path,sha,mode:'100644',type:'blob'})),...Object.keys(base.paths).filter(path=>!Object.hasOwn(paths,path)).map(path=>({path,sha:null,mode:'100644',type:'blob'}))];
  const created=await this.request(`${root}/git/trees`,'POST',{base_tree:base.tree,tree});
  const commit=await this.request(`${root}/git/commits`,'POST',{message:`Publish EmDash content ${contentHash.slice(0,12)}`,tree:created.sha,parents:[base.head]});
  if(!oid(commit.sha))throw Error('Invalid created Git commit');return commit.sha;
 }
 async update(base,commit){
  if(!oid(base.head)||!oid(commit)||!base.nodeId)throw Error('Invalid Git reference update');
  try{
   const result=await this.request('https://api.github.com/graphql','POST',{query:'mutation Publish($input: UpdateRefsInput!) { updateRefs(input: $input) { clientMutationId } }',variables:{input:{repositoryId:base.nodeId,refUpdates:[{name:'refs/heads/main',beforeOid:base.head,afterOid:commit,force:false}]}}});
   if(!result.data?.updateRefs)throw Error('GitHub returned an incomplete reference update');
  }catch(error){if(await this.head()!==commit)throw error;}
 }
}
