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
