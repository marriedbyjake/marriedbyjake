import fs from 'node:fs/promises';
import path from 'node:path';
// --keep-vars retains variables omitted from upload metadata. A configured
// value still overwrites its remote counterpart. Keep the reviewed disabled
// source default, but omit that one switch from the generated CI artifact so
// both owner activation and emergency pauses survive atomically at deployment.
export async function prepareDeploymentConfig(source,{root=process.cwd()}={}) {
 const redirect=JSON.parse(await fs.readFile(path.join(root,'.wrangler/deploy/config.json'),'utf8'));
 const file=path.join(root,'dist/server/wrangler.json');
 if(path.resolve(root,'.wrangler/deploy',redirect.configPath)!==path.resolve(file))throw Error('Unexpected generated deployment configuration');
 const config=JSON.parse(await fs.readFile(file,'utf8'));
 if(config.name!==source.name||config.account_id!==source.account_id||source.vars?.PUBLISHING_ENABLED!=='false'||config.vars?.PUBLISHING_ENABLED!=='false')throw Error('Generated Worker settings differ from the reviewed disabled configuration');
 delete config.vars.PUBLISHING_ENABLED;
 await fs.writeFile(file,JSON.stringify(config));
}
