import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {publishingStatus,retryFromEditor} from '../../src/publishing/status.mjs';
import {deploymentLock} from '../../src/publishing/deployment-lock.mjs';
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('CREATE TABLE options(name TEXT PRIMARY KEY,value TEXT,revision INTEGER DEFAULT 0)');return {sqlite,prepare(sql){return {bind(...args){this.args=args;return this;},first:async function(){return sqlite.prepare(sql).get(...(this.args||[]))||null;},run:async function(){return sqlite.prepare(sql).run(...(this.args||[]));}};}};}
test('disabled publishing status never creates a ledger; retry is authenticated, same-origin and cannot activate publishing',async()=>{
 const env={PUBLISHING_ENABLED:'false',DB:{prepare(){throw Error('Disabled status touched D1');}}};
 assert.equal((await publishingStatus(env)).phase,'disabled');
 const request=(origin='https://marriedbyjake.com')=>new Request('https://marriedbyjake.com/_publishing/retry',{method:'POST',headers:{Origin:origin}});
 assert.equal((await retryFromEditor(request(),env,false)).status,403);
 assert.equal((await retryFromEditor(request('https://foreign.example'),env,true)).status,403);
 assert.equal((await retryFromEditor(request('null'),env,true)).status,403);
 assert.equal((await retryFromEditor(new Request('https://marriedbyjake.com/_publishing/retry',{method:'POST'}),env,true)).status,403);
 assert.equal((await retryFromEditor(request(),env,true)).status,409);
});
test('editor status shows a failed release without leaking private jobs, and retry preserves uncertain commit intent',async()=>{
 const db=database();try{
  db.sqlite.prepare('INSERT INTO options VALUES(?,?,0)').run('marriedbyjake:publishing',JSON.stringify({phase:'paused',baselineHash:'hash',job:{commit:'a'.repeat(40),private:'PRIVATE'},cache:{private:'PRIVATE'},reason:'Git main advanced'}));
  const env={DB:db,PUBLISHING_ENABLED:'true'};const status=await publishingStatus(env);
  assert.equal(status.phase,'paused');assert.equal(status.canRetry,true);assert.ok(!JSON.stringify(status).includes('PRIVATE'));
  const response=await retryFromEditor(new Request('https://marriedbyjake.com/_publishing/retry',{method:'POST',headers:{Origin:'https://marriedbyjake.com'}}),env,true);assert.equal(response.status,303);
  const state=JSON.parse(db.sqlite.prepare('SELECT value FROM options').get().value);assert.equal(state.job.commit,'a'.repeat(40));assert.equal(state.phase,'preparing');
 }finally{db.sqlite.close();}
});
test('dedicated build credential operates only a fenced deployment lease; wrong credentials, holders and commits fail closed',async()=>{
 const db=database(),env={DB:db,PUBLISHING_BUILD_SECRET:'synthetic-build-secret'},commit='a'.repeat(40);
 const request=(body,token='synthetic-build-secret')=>new Request('https://marriedbyjake.com/_publishing/deployment',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 try{
  assert.equal((await deploymentLock(request({action:'claim',commit},'wrong'),env)).status,401);assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM options').get().n,0);
  const claimed=await deploymentLock(request({action:'claim',commit}),env);assert.equal(claimed.status,200);const {leaseId}=await claimed.json();
  assert.equal((await deploymentLock(request({action:'claim',commit}),env)).status,409);
  assert.equal((await deploymentLock(request({action:'renew',commit:'b'.repeat(40),leaseId}),env)).status,409);
  assert.equal((await deploymentLock(request({action:'renew',commit,leaseId}),env)).status,204);
  assert.equal((await deploymentLock(request({action:'release',commit,leaseId}),env)).status,204);
  assert.equal((await deploymentLock(request({action:'renew',commit,leaseId}),env)).status,409);
  assert.deepEqual(db.sqlite.prepare('SELECT name FROM options').all().map(row=>row.name),['marriedbyjake:deployment']);
 }finally{db.sqlite.close();}
});
