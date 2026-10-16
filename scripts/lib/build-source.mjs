import {execFileSync} from 'node:child_process';
export function buildSource({root='.',env=process.env,strict=env.WORKERS_CI==='1'}={}) {
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const commit=git(['rev-parse','HEAD']);
 const dirty=!!git(['status','--porcelain','--untracked-files=normal','--','.',':(exclude).astro']);
 if(strict){
  if(env.WORKERS_CI!=='1'||env.WORKERS_CI_BRANCH!=='main')throw Error('Production releases require a Cloudflare main-branch build');
  if(!/^[a-f0-9]{40}$/.test(env.WORKERS_CI_COMMIT_SHA||'')||env.WORKERS_CI_COMMIT_SHA!==commit)throw Error('Cloudflare build SHA differs from the checkout');
  if(dirty)throw Error('Production releases require a clean exact-commit checkout');
 }
 return {commit:dirty?null:commit,dirty};
}
