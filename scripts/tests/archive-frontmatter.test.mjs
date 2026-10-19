import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveFrontmatter} from '../lib/archive-frontmatter.mjs';

test('archive parsing preserves YAML dates, quoted copy, lists and the exact Markdown body',()=>{
 const body='\nJake’s **original words**.\n';
 const result=archiveFrontmatter('\uFEFF---\ntitle: "A wedding: together"\npubDate: 2026-10-01\nfeatured: false\nimages:\n  - first.jpg\n  - second.jpg\n---\n'+body);
 assert.equal(result.data.title,'A wedding: together');
 assert.equal(result.data.pubDate.toISOString(),'2026-10-01T00:00:00.000Z');
 assert.equal(result.data.featured,false);
 assert.deepEqual(result.data.images,['first.jpg','second.jpg']);
 assert.equal(result.content,body);
 assert.equal(archiveFrontmatter(body).content,body);
});

test('archive YAML refuses executable tags and duplicate fields',()=>{
 assert.throws(()=>archiveFrontmatter('---\nvalue: !!js/function >\n  function () { return 1; }\n---\nCopy'),/unknown tag/);
 assert.throws(()=>archiveFrontmatter('---\ntitle: Original\ntitle: Replacement\n---\nCopy'),/duplicated mapping key/);
});
