import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

// Inspect emitted modules, since source-level import() alone does not prove
// that a bundler kept the CMS out of the entrypoint's startup dependency graph.
export async function inspectWorkerStartup(directory='dist/server') {
 const root=path.resolve(directory),files=new Map(),deferred=new Set();
 const resolve=(file,specifier)=>{
  if(!specifier.startsWith('.'))return;
  const target=path.resolve(path.dirname(file),specifier);
  if(!target.startsWith(root+path.sep))throw Error('Worker module escapes the build directory');
  return target;
 };
 async function visit(file){
  if(files.has(file))return;
  const source=await fs.readFile(file,'utf8');files.set(file,Buffer.byteLength(source));
  const parsed=ts.createSourceFile(file,source,ts.ScriptTarget.ESNext,true,ts.ScriptKind.JS);
  const eager=[];
  for(const statement of parsed.statements){
   if((ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement))&&statement.moduleSpecifier&&ts.isStringLiteral(statement.moduleSpecifier)){
    const target=resolve(file,statement.moduleSpecifier.text);if(target)eager.push(target);
   }
  }
  function imports(node){
   if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0])){
    const target=resolve(file,node.arguments[0].text);if(target)deferred.add(target);
   }
   ts.forEachChild(node,imports);
  }
  imports(parsed);
  for(const target of eager)await visit(target);
 }
 await visit(path.join(root,'entry.mjs'));
 return {bytes:[...files.values()].reduce((a,b)=>a+b,0),files:[...files.keys()].map(file=>path.relative(root,file)).sort(),deferred:[...deferred].filter(file=>!files.has(file)).map(file=>path.relative(root,file)).sort()};
}
