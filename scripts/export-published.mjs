import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { projectPublished, snapshotSql } from './lib/published-content.mjs';

import { writePublished } from './lib/write-published.mjs';

const args = process.argv.slice(2);
const arg = name => { const i=args.indexOf(name); return i<0?undefined:args[i+1]; };
const database = arg('--database');
const backup = arg('--backup');
const archive = arg('--media-archive');
const mediaResult = arg('--media-index');
if ((!database && !backup) || !archive || !mediaResult) throw new Error('Use --database or --backup, plus --media-archive and --media-index. Inputs stay private.');
let snapshot;
if (database) {
  const db = new DatabaseSync(database, { readOnly: true });
  snapshot=JSON.parse(db.prepare(snapshotSql()).get().snapshot);db.close();
} else snapshot=JSON.parse(await fs.readFile(backup,'utf8'));
const media=new Map(JSON.parse(await fs.readFile(mediaResult,'utf8')).objectsDetail.map(row=>[row.id,row]));
const projected=await projectPublished(snapshot, async row=>{
  const cached=media.get(row.id);if(!cached)throw Error('Media backup is incomplete');
  return execFileSync('tar',['-xOf',archive,`media/${path.basename(cached.file)}`],{maxBuffer:32*1024*1024});
});
const root=path.resolve(arg('--output') || '.');
const counts = await writePublished(root,projected);
console.log(JSON.stringify({contentHash:projected.contentHash,collections:counts,media:projected.assets.size,mediaBytes:[...projected.assets.values()].reduce((sum,data)=>sum+data.length,0),output:root}));
