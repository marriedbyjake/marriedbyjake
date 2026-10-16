import fs from 'node:fs/promises';
import path from 'node:path';
import {releaseFiles} from './published-content.mjs';

/** Replace only the two publisher-owned directories inside its isolated clone. */
export async function writePublished(root, projected) {
 const directory=path.join(root,'content/published');const images=path.join(root,'src/images/published');
 await fs.mkdir(directory,{recursive:true});await fs.mkdir(images,{recursive:true});
 const {files,counts}=releaseFiles(projected);
 for(const [name,body] of Object.entries(files))await fs.writeFile(path.join(directory,name),body);
 for(const [name,bytes] of projected.assets)await fs.writeFile(path.join(images,name),bytes);
 for(const name of await fs.readdir(directory))if(!Object.hasOwn(files,name))await fs.rm(path.join(directory,name));
 for(const name of await fs.readdir(images))if(!projected.assets.has(name))await fs.rm(path.join(images,name));
 return counts;
}
