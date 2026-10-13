import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../admin.js',import.meta.url),'utf8');
test('painel inclui login e gestão de pedidos',()=>{
 for(const id of ['login-form','login-view','dashboard','logout','orders','refresh','store-state','store-toggle','admin-message'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('painel utiliza token Bearer e endpoints administrativos',()=>{
 for(const route of ['/admin/login','/admin/orders','/admin/store'])assert.ok(js.includes(route),route);
 assert.match(js,/authorization:'Bearer '\+token/);
 assert.match(js,/method:'PATCH'/);
});
test('token permanece apenas na memória e conteúdo de pedidos usa texto seguro',()=>{
 assert.doesNotMatch(js,/localStorage|sessionStorage|\.innerHTML\s*=/);
 assert.match(js,/textContent/);
 assert.match(js,/function logout\(\)/);
});

test('painel administra categorias e produtos com rotas protegidas',()=>{
 for(const id of ['category-form','product-form','category-list','product-list','product-category','catalog-refresh'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const route of ['/admin/manage/categories','/admin/manage/products'])assert.ok(js.includes(route),route);
 assert.match(js,/Math\.round\(price\*100\)/);
 assert.match(js,/\/active/);
});

test('painel permite gerir adicionais cupons e regiões de entrega',()=>{
 for(const id of ['addon-form','coupon-form','area-form','addon-list','coupon-list','area-list','commercial-refresh'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const route of ['addons','coupons','delivery-areas'])assert.ok(js.includes(route),route);
 assert.match(js,/function parseCents\(raw\)/);
 assert.match(js,/registerCommercialForm/);
});

test('sessão expirada limpa dados sensíveis e login inválido não dispara logout',()=>{
 assert.match(js,/if\(sessionToken&&\(response\.status===401\|\|response\.status===403\)\)/);
 assert.match(js,/for\(const id of \['orders','category-list','product-list','addon-list','coupon-list','area-list'\]\)/);
 assert.match(js,/categories=\[\]/);
 assert.match(js,/Sessão encerrada\. Entre novamente\./);
});

test('requisições antigas não podem restaurar dados de outra sessão',()=>{
 assert.match(js,/const sessionToken=token/);
 assert.match(js,/if\(sessionToken!==token\)throw Error/);
 assert.match(js,/if\(sessionToken&&\(response\.status===401\|\|response\.status===403\)\)/);
});

test('falha de autenticação apaga a senha sem limpar o email',()=>{
 assert.match(js,/event\.currentTarget\.querySelector\('\[name="password"\]'\)\.value=''/);
});

test('painel permite editar produtos sem reativar produtos inativos',()=>{
 for(const id of ['product-submit','product-cancel'])assert.ok(html.includes('id="'+id+'"'));
 assert.ok(js.includes("editingProduct?'/'+editingProduct.id:''"));
 assert.match(js,/method:editingProduct\?'PUT':'POST'/);
 assert.match(js,/active:editingProduct\?Boolean\(editingProduct\.active\):true/);
 assert.match(js,/editingProduct=null/);
});
