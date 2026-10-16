import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {buildSource} from '../lib/build-source.mjs';
import {guardedDeployment} from '../lib/deployment-gate.mjs';
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
