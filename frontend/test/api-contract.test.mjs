import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const backend=readFileSync(new URL('../../backend/src/server.js',import.meta.url),'utf8');
const management=readFileSync(new URL('../../backend/src/management.js',import.meta.url),'utf8');
const storefront=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const admin=readFileSync(new URL('../admin.js',import.meta.url),'utf8');

test('checkout envia apenas campos aceitos pela validação do backend',()=>{
 for(const field of ['customer_name','customer_phone','fulfillment','payment_method','items','address','delivery_area_id','coupon']){
  assert.match(backend,new RegExp('\\b'+field+'\\b'),'Backend sem campo '+field);
  assert.match(storefront,new RegExp('\\b'+field+'\\b'),'Frontend sem campo '+field);
 }
 for(const field of ['product_id','quantity','addon_ids']){
  assert.match(backend,new RegExp('\\b'+field+'\\b'));
  assert.match(storefront,new RegExp('\\b'+field+'\\b'));
 }
});
test('contrato público de catálogo, loja, criação e rastreio permanece alinhado',()=>{
 for(const route of ['/api/catalog','/api/store','/api/orders']){
  assert.ok(backend.includes(route),route);
  assert.ok(storefront.includes(route.replace('/api','')),route);
 }
 for(const field of ['categories','products','addons','delivery_areas','accepting_orders','order_id','total_cents','status']){
  assert.ok(backend.includes(field),'Backend: '+field);
  assert.ok(storefront.includes(field),'Frontend: '+field);
 }
});
test('painel usa rotas de gestão protegidas e campos válidos',()=>{
 assert.match(backend,/app\.use\('\/api\/admin\/manage',auth,management\)/);
 for(const resource of ['categories','products','addons','coupons','delivery-areas']){
  assert.ok(management.includes(resource));
  assert.ok(admin.includes(resource));
 }
 for(const field of ['category_id','price_cents','percent_off','fee_cents','active']){
  assert.ok(management.includes(field));
  assert.ok(admin.includes(field));
 }
});

test('contrato de itens e adicionais do pedido permanece alinhado ao painel',()=>{
 assert.match(backend,/app\.get\('\/api\/admin\/orders',auth/);
 assert.match(backend,/FROM order_items WHERE order_id=/);
 assert.match(backend,/FROM order_item_addons WHERE order_item_id=/);
 for(const field of ['items','product_name','quantity','addons','addon_name']){
  assert.ok(backend.includes(field),'Backend sem campo '+field);
  assert.ok(admin.includes(field),'Painel sem campo '+field);
 }
 assert.match(admin,/order\.items/);
 assert.match(admin,/item\.addons/);
 assert.doesNotMatch(admin,/\.innerHTML\s*=/);
});
