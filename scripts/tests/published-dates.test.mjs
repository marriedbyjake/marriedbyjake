import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
test('committed SQLite modification dates retain UTC across local and hosted build timezones',async()=>{
 const source=(await readFile('src/lib/published-loader.ts','utf8')).replace("import media from '../../content/published/media.json';",'const media={items:{}};');
 const module='data:text/javascript,'+encodeURIComponent(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 const entries=Object.fromEntries(['2026-10-01 10:53:16','2026-10-17T10:53:16.123Z','2026-10-17T21:53:16+11:00'].map((updatedAt,index)=>['entry'+index,{cmsId:'synthetic',updatedAt,data:{title:'Synthetic'}}]));
 const script=`import {parsePublished} from ${JSON.stringify(module)};console.log(JSON.stringify(parsePublished(${JSON.stringify(JSON.stringify({formatVersion:1,entries}))}).map(entry=>new Date(entry.updatedAt).toISOString())));`;
 for(const TZ of ['UTC','Australia/Hobart','America/New_York']){
  const values=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ},encoding:'utf8'}));
  assert.deepEqual(values,['2026-10-01T10:53:16.000Z','2026-10-17T10:53:16.123Z','2026-10-17T10:53:16.000Z'],TZ);
 }
});
