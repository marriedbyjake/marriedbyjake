import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {buildSource} from '../lib/build-source.mjs';
import {guardedDeployment} from '../lib/deployment-gate.mjs';
import {prepareDeploymentConfig} from '../lib/deployment-config.mjs';
test('CI upload omits only the activation switch, preserving owner pauses without changing source or resource bindings',async()=>{
 const root=await mkdtemp(tmpdir()+'/mbj-deploy-config-');
 try{
  await mkdir(root+'/.wrangler/deploy',{recursive:true});await mkdir(root+'/dist/server',{recursive:true});
  const source={name:'synthetic-worker',account_id:'synthetic-account',vars:{PUBLISHING_ENABLED:'false',GITHUB_APP_ID:'synthetic-app'}};
  const generated={...source,main:'entry.mjs',d1_databases:[{binding:'DB',database_id:'synthetic-db'}]};
  await writeFile(root+'/.wrangler/deploy/config.json',JSON.stringify({configPath:'../../dist/server/wrangler.json'}));await writeFile(root+'/dist/server/wrangler.json',JSON.stringify(generated));
  await prepareDeploymentConfig(source,{root});
  const actual=JSON.parse(await readFile(root+'/dist/server/wrangler.json','utf8'));const expected=structuredClone(generated);delete expected.vars.PUBLISHING_ENABLED;
  assert.deepEqual(actual,expected);assert.equal(source.vars.PUBLISHING_ENABLED,'false');
  await writeFile(root+'/.wrangler/deploy/config.json',JSON.stringify({configPath:'../../source.json'}));await assert.rejects(prepareDeploymentConfig(source,{root}),/Unexpected/);
 }finally{await rm(root,{recursive:true,force:true});}
});
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE options(name TEXT PRIMARY KEY,value TEXT,revision INTEGER DEFAULT 0)');return {sqlite,prepare(sql){return {bind(...args){return {first:async()=>sqlite.prepare(sql).get(...args)||null,run:async()=>sqlite.prepare(sql).run(...args)};}};}};}
test('CI source gate rejects dirty checkouts, wrong SHA, missing CI and non-main builds',async()=>{
 const root=await mkdtemp(tmpdir()+'/mbj-source-');
 try{
  const git=args=>execFileSync('git',args,{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();
  git(['init','-q']);git(['config','user.name','Synthetic']);git(['config','user.email','test@example.invalid']);await writeFile(root+'/source','exact');git(['add','.']);git(['commit','-qm','synthetic']);
  const sha=git(['rev-parse','HEAD']),env={WORKERS_CI:'1',WORKERS_CI_BRANCH:'main',WORKERS_CI_COMMIT_SHA:sha};
  assert.equal(buildSource({root,env}).commit,sha);
  for(const patch of [{WORKERS_CI_COMMIT_SHA:'0'.repeat(40)},{WORKERS_CI_BRANCH:'other'},{WORKERS_CI:undefined}])assert.throws(()=>buildSource({root,env:{...env,...patch},strict:true}));
  await writeFile(root+'/source','uncommitted');assert.throws(()=>buildSource({root,env}),/clean/);assert.equal(buildSource({root,env:{}}).commit,null);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('deployment gate rejects stale commits, concurrent deploys and failed uploads while preserving healthy release',async()=>{
 const db=database();let live='healthy';let finish;const started=new Promise(resolve=>{finish=resolve;});let unblock;const blocked=new Promise(resolve=>{unblock=resolve;});
 try{
  await assert.rejects(guardedDeployment({db,commit:'old',head:async()=>'new',deploy:async()=>{live='bad';}}),/Stale/);assert.equal(live,'healthy');
  const old=guardedDeployment({db,commit:'old',head:async()=>'old',deploy:async()=>{finish();await blocked;live='old';}});await started;
  await assert.rejects(guardedDeployment({db,commit:'new',head:async()=>'new',deploy:async()=>{live='new';}}),/lock/);
  unblock();await old;
  await guardedDeployment({db,commit:'new',head:async()=>'new',deploy:async()=>{live='new';}});
  await assert.rejects(guardedDeployment({db,commit:'old',head:async()=>'new',deploy:async()=>{live='old';}}),/Stale/);assert.equal(live,'new');
  await assert.rejects(guardedDeployment({db,commit:'new',head:async()=>'new',deploy:async()=>{throw Error('synthetic upload failure');}}));assert.equal(live,'new');
 }finally{unblock();db.sqlite.close();}
});
