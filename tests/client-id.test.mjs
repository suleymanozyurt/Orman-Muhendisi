import test from 'node:test';
import assert from 'node:assert/strict';
import {clientId} from '../app/client-id.ts';
import {webcrypto} from 'node:crypto';

test('HTTP-only crypto capabilities produce a compatible UUID without a weak random fallback',()=>{
 const source={getRandomValues:values=>{values.set(Array.from({length:16},(_,i)=>i));return values;}};
 assert.equal(clientId(source),'00010203-0405-4607-8809-0a0b0c0d0e0f');
 const random={getRandomValues:webcrypto.getRandomValues.bind(webcrypto)};
 const ids=Array.from({length:100},()=>clientId(random));assert.equal(new Set(ids).size,ids.length);
 for(const id of ids)assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
});
test('a native UUID implementation keeps its receiver and avoids redundant random work',()=>{
 const source={value:'a00602a0-2518-4f18-ab5e-514459aa82fb',randomUUID(){return this.value;},getRandomValues(){assert.fail('Native UUID already supplied');}};
 assert.equal(clientId(source),source.value);
});
