import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const fixture = {
  australianCeremonies: { title: 'Ceremony', price: '$2,000 + tax and travel', description: 'Published words' },
  internationalCeremonies: { title: 'International', price: 'By quote', description: 'Published words' },
  mc: { title: 'MC', price: '$1,000', description: 'Published words' },
};
globalThis.pricingTest = { data: fixture };
const stub = `data:text/javascript,${encodeURIComponent('export async function getEntry(collection, slug) { if (collection !== "pricing" || slug !== "index") throw new Error("Wrong pricing source"); return globalThis.pricingTest; }')}`;
const source = fs.readFileSync(new URL('../src/lib/pricing.ts', import.meta.url), 'utf8').replace('"./cms"', JSON.stringify(stub));
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { getPricing, extractPrice, pricingUrl } = await import(`data:text/javascript,${encodeURIComponent(output)}`);
assert.equal(pricingUrl, '/serviceandprice');
assert.equal(await getPricing(), fixture);
assert.equal((await getPricing()).australianCeremonies.price, '$2,000 + tax and travel', 'Keep the complete CMS qualification');
fixture.australianCeremonies.price = '$2,500';
assert.equal((await getPricing()).australianCeremonies.price, '$2,500', 'A published price change must be visible without a build or cross-request cache');
assert.equal(extractPrice('from $2,500–$5,000'), 2500);
assert.equal(extractPrice('$2,000 + tax and travel'), 2000);
assert.equal(extractPrice('By quote'), null);
globalThis.pricingTest = undefined;
await assert.rejects(getPricing(), /Published pricing data not found/);
delete globalThis.pricingTest;
console.log('Pricing passed: one published CMS source, complete wording, fresh reads, numeric Offer extraction and missing-data failure.');
