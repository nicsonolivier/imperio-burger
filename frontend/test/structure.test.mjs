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

test('carrinho não muda enquanto checkout está enviando pedido',()=>{
 assert.match(js,/add\.disabled=!state\.open\|\|state\.submitting/);
 assert.match(js,/extras\.disabled=state\.submitting/);
 assert.match(js,/remove\.disabled=state\.submitting/);
 assert.match(js,/minus\.disabled=state\.submitting/);
 assert.match(js,/plus\.disabled=state\.submitting\|\|line\.quantity>=30/);
 assert.match(js,/state\.submitting=true;\s*renderCatalog\(\);renderCart\(\)/);
 assert.match(js,/finally\{state\.submitting=false;for\(const field of/);
 assert.match(js,/field\.disabled=false;renderCatalog\(\);renderCart\(\)\}/);
});

test('formulário de checkout é bloqueado só depois da leitura do FormData',()=>{
 const read=js.indexOf('const data=new FormData(event.currentTarget)');
 const lock=js.indexOf("for(const field of $('checkout').querySelectorAll('input,select,textarea'))field.disabled=true");
 const unlock=js.indexOf("for(const field of $('checkout').querySelectorAll('input,select,textarea'))field.disabled=false");
 assert.ok(read>=0&&lock>read&&unlock>lock);
 assert.match(js,/if\(state\.submitting\)return;\s*const delivery=/);
});
