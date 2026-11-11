import test from 'node:test';
import assert from 'node:assert/strict';
import {botanicalAccount} from '../app/botanical-accounts.ts';
test('morphology is localized and never inherited by a subspecies or a different species',()=>{
 assert.match(botanicalAccount('cedrus-libani','tr').fruitNote,/ikinci yılda/);
 assert.match(botanicalAccount('pinus-pinea','en').fruitNote,/three years/);
 assert.deepEqual(botanicalAccount('cedrus-libani-var.-libani','tr'),{});
 assert.deepEqual(botanicalAccount('quercus-cerris','tr'),{});
 assert.match(botanicalAccount('quercus-infectoria','tr').barkNote,/kabuk dokusu açıklanmamıştır/);
 for(const id of ['cedrus-libani','pinus-pinea','quercus-infectoria','abies-cilicica','abies-alba','abies-sibirica','crocus-fleischeri','equisetum-hyemale'])for(const language of ['tr','en']){const a=botanicalAccount(id,language);for(const field of ['description','leafNote','leafShape','fruitNote','barkNote','morphologySource'])assert(a[field]);}
});

test('non-flowering horsetails and incomplete crocus fruit accounts remain explicit',()=>{assert.match(botanicalAccount('equisetum-hyemale','tr').fruitNote,/Çiçek oluşturmaz/);assert.match(botanicalAccount('crocus-fleischeri','tr').fruitNote,/meyve morfolojisi açıklanmamıştır/);assert.deepEqual(botanicalAccount('crocus-fleischeri-subsp.-unknown','tr'),{});});
