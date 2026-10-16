import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {commitPublishedGit} from '../lib/git-publication.mjs';
import {PublicationConflict} from '../lib/publishing-queue.mjs';
const command=(cwd,args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
async function fixture(fn){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mbj-git-test-'));
 try{
  const remote=path.join(root,'remote.git'),editor=path.join(root,'editor'),publisher=path.join(root,'publisher');
  command(root,['init','--bare','--initial-branch=main',remote]);command(root,['clone',remote,editor]);
  for(const cwd of [editor]){command(cwd,['config','user.name','Test fixture']);command(cwd,['config','user.email','fixture@example.invalid']);}
  await fs.mkdir(path.join(editor,'content/published'),{recursive:true});await fs.mkdir(path.join(editor,'src/images/published'),{recursive:true});
  await fs.writeFile(path.join(editor,'content/published/posts.json'),'old published text');await fs.writeFile(path.join(editor,'src/images/published/old.jpg'),'old image');
  command(editor,['add','.']);command(editor,['commit','-m','Synthetic baseline']);command(editor,['push','origin','main']);
  command(root,['clone',remote,publisher]);command(publisher,['config','user.name','Test fixture']);command(publisher,['config','user.email','fixture@example.invalid']);
  const git=args=>command(publisher,args);const base=git(['rev-parse','HEAD']);
  await fs.writeFile(path.join(publisher,'content/published/posts.json'),'new published text');await fs.rm(path.join(publisher,'src/images/published/old.jpg'));
  await fn({root,remote,editor,publisher,git,base});
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
test('real Git push publishes the intended files and removals as one commit',()=>fixture(async({remote,git,base})=>{
 const commit=commitPublishedGit(git,'a'.repeat(64),base);
 assert.equal(command(remote,['rev-parse','refs/heads/main']),commit);
 assert.equal(command(remote,['show',`${commit}:content/published/posts.json`]),'new published text');
 assert.throws(()=>command(remote,['show',`${commit}:src/images/published/old.jpg`]));
}));
test('a real Git edit before commit pauses without overwriting it',()=>fixture(async({editor,remote,git,base})=>{
 await fs.writeFile(path.join(editor,'content/published/posts.json'),'human Git wording');command(editor,['add','.']);command(editor,['commit','-m','Synthetic human edit']);command(editor,['push','origin','main']);
 assert.throws(()=>commitPublishedGit(git,'a'.repeat(64),base),PublicationConflict);
 assert.equal(command(remote,['show','main:content/published/posts.json']),'human Git wording');
}));
test('a Git race at push rejects the ordinary push and preserves the winner',()=>fixture(async({editor,remote,git,base})=>{
 let raced=false;const racingGit=args=>{
  if(args[0]==='push'&&!raced){raced=true;command(editor,['commit','--allow-empty','-m','Synthetic racing edit']);command(editor,['push','origin','main']);}
  return git(args);
 };
 assert.throws(()=>commitPublishedGit(racingGit,'a'.repeat(64),base),PublicationConflict);
 assert.equal(command(remote,['show','main:content/published/posts.json']),'old published text');
}));
test('an accepted push with a lost response is recovered without duplication',()=>fixture(async({remote,git,base})=>{
 const uncertain=args=>{const result=git(args);if(args[0]==='push')throw Error('lost response');return result;};
 const commit=commitPublishedGit(uncertain,'a'.repeat(64),base);assert.equal(command(remote,['rev-parse','main']),commit);assert.equal(command(remote,['rev-list','--count','main']),'2');
}));
