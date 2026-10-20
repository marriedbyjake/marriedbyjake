import test from 'node:test';
import assert from 'node:assert/strict';
import {isUnlistedPage,unlistedDestination} from '../../src/lib/page-discovery.mjs';

test('pricing discovery policy covers direct, historical, query and HTML aliases',()=>{
  for(const value of ['/serviceandprice','/serviceandprice/?source=email','/serviceandprice.html','/celebrantcost','/celebrantcost.html?source=email','https://www.marriedbyjake.com/serviceandprice#fees']){
    assert.equal(isUnlistedPage(value),true,value);
    assert.equal(unlistedDestination(value),'/serviceandprice',value);
  }
});

test('pricing discovery policy leaves other pages, private previews and foreign URLs alone',()=>{
  for(const value of ['/services','/faq','/blog/pricing-a-wedding','/_preview/pricing/example','https://example.com/serviceandprice','https://marriedbyjake.com.example/serviceandprice','javascript:alert(1)'])assert.equal(isUnlistedPage(value),false,value);
});
