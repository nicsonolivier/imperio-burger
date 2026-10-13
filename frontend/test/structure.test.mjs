import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
test('interface possui elementos necessários ao checkout',()=>{
 for(const id of ['cart','cart-items','checkout','fulfillment','delivery-fields','delivery-area','address','subtotal','delivery-fee','total','submit-order','checkout-message','products','categories','store-badge','tracking-form','tracking-id','tracking-result']){
  assert.match(html,new RegExp('id="'+id+'"'),'Elemento ausente: '+id);
 }
});
test('frontend consulta rotas públicas da API e envia pedidos',()=>{
 for(const route of ['/store','/catalog','/orders'])assert.ok(js.includes(route),'Rota ausente: '+route);
 assert.match(js,/method:'POST'/);
 assert.match(js,/JSON\.stringify\(payload\)/);
});
test('conteúdo remoto não é inserido como HTML executável',()=>{
 assert.doesNotMatch(js,/\.innerHTML\s*=/);
 assert.match(js,/textContent/);
});
test('layout contém adaptação para telas pequenas',()=>{
 assert.match(css,/@media\s*\(max-width:/);
});

test('acompanhamento valida UUID e traduz status',()=>{
 assert.match(js,/async function trackOrder\(id\)/);
 assert.match(js,/statusLabels/);
 assert.match(js,/encodeURIComponent\(value\)/);
});

test('checkout bloqueia múltiplos envios simultâneos',()=>{
 assert.match(js,/submitting:false/);
 assert.match(js,/if\(!state\.cart\.length\|\|!state\.open\|\|state\.submitting\)return/);
 assert.match(js,/state\.submitting=true/);
 assert.match(js,/finally\{state\.submitting=false/);
 assert.match(js,/!count\|\|!state\.open\|\|state\.submitting/);
});

test('rastreamento ignora respostas atrasadas de pedidos anteriores',()=>{
 assert.match(js,/let trackingRequestId=0/);
 assert.match(js,/const requestId=\+\+trackingRequestId/);
 assert.match(js,/if\(requestId!==trackingRequestId\)return/);
 assert.match(js,/if\(requestId===trackingRequestId\)/);
});
