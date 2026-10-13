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
 assert.match(js,/extras\.disabled=state\.submitting\|\|line\.addon_ids\.length>=12/);
 assert.match(js,/remove\.disabled=state\.submitting/);
 assert.match(js,/minus\.disabled=state\.submitting/);
 assert.match(js,/plus\.disabled=state\.submitting\|\|line\.quantity>=30/);
 assert.match(js,/state\.submitting=true;\s*renderCatalog\(\);renderCart\(\)/);
 assert.match(js,/finally\{state\.submitting=false;for\(const field of/);
 assert.match(js,/field\.disabled=false;renderCatalog\(\);updateFulfillment\(\)\}/);
});

test('formulário de checkout é bloqueado só depois da leitura do FormData',()=>{
 const read=js.indexOf('const data=new FormData(event.currentTarget)');
 const lock=js.indexOf("for(const field of $('checkout').querySelectorAll('input,select,textarea'))field.disabled=true");
 const unlock=js.indexOf("for(const field of $('checkout').querySelectorAll('input,select,textarea'))field.disabled=false");
 assert.ok(read>=0&&lock>read&&unlock>lock);
 assert.match(js,/if\(state\.submitting\)return;\s*const delivery=/);
});

test('carrinho respeita limite de 30 linhas do backend',()=>{
 assert.match(js,/state\.cart\.length>=30&&!state\.cart\.some\(x=>x\.product_id===product\.id\)/);
 assert.match(js,/if\(!existing&&state\.cart\.length>=30\)return/);
 assert.match(js,/\$\('submit-order'\)\.disabled=[^;]+;\s*renderCatalog\(\)/);
});

test('seleção de extras bloqueia o 13º adicional',()=>{
 assert.match(js,/extras\.disabled=state\.submitting\|\|line\.addon_ids\.length>=12/);
 assert.match(js,/if\(state\.submitting\|\|line\.addon_ids\.length>=12\)return/);
});

test('checkout limpa dados do comprador apenas após pedido aceito',()=>{
 const accepted=js.indexOf("const order=await api('/orders',{method:'POST'");
 const reset=js.indexOf("$('checkout').reset()");
 assert.ok(accepted>=0&&reset>accepted);
 assert.match(js,/finally\{state\.submitting=false;[^}]*updateFulfillment\(\)\}/);
});

test('novo pedido invalida rastreamento pendente de pedido antigo',()=>{
 const checkout=js.indexOf("const order=await api('/orders',{method:'POST'");
 const invalidate=js.indexOf('++trackingRequestId;',checkout);
 const clear=js.indexOf("$('tracking-result').textContent='';",checkout);
 const newId=js.indexOf("$('tracking-id').value=order.order_id;",checkout);
 assert.ok(checkout>=0&&invalidate>checkout&&clear>invalidate&&newId>clear);
});

test('carrinho acessível pode fechar com Escape e restaura foco',()=>{
 assert.match(html,/id="cart-toggle"[^>]*aria-controls="cart" aria-expanded="false"/);
 assert.match(js,/setAttribute\('aria-expanded',String\(open\)\)/);
 assert.match(js,/if\(open\)\$\('cart-close'\)\.focus\(\);else if\(\$\('cart'\)\.contains\(document\.activeElement\)\)\$\('cart-toggle'\)\.focus\(\)/);
 assert.match(js,/event\.key==='Escape'/);
});

test('carrinho fechado não permite navegação por teclado em controles ocultos',()=>{
 assert.match(html,/<aside id="cart"[^>]*aria-hidden="true" inert>/);
 assert.match(js,/\$\('cart'\)\.inert=!open/);
});

test('atalho de teclado permite pular direto ao cardápio',()=>{
 assert.match(html,/<a class="skip-link" href="#cardapio">Ir direto ao cardápio<\/a>/);
 assert.match(css,/\.skip-link:focus\{/);
 assert.match(css,/:focus-visible\{/);
});

test('cardápio mostra mensagem quando não há produtos na categoria',()=>{
 assert.match(js,/if\(!visibleProducts\.length\)/);
 assert.match(js,/Nenhum produto disponível nesta categoria/);
 assert.match(js,/Nosso cardápio está sendo preparado/);
 assert.match(css,/\.catalog-empty\{/);
});

test('edição do código de rastreamento invalida resposta pendente',()=>{
 assert.match(js,/\$\('tracking-id'\)\.addEventListener\('input',\(\)=>\{\+\+trackingRequestId;\$\('tracking-result'\)\.textContent=''\}\)/);
});

test('entrega indisponível sem regiões de entrega cadastradas',()=>{
 assert.match(js,/querySelector\('option\[value="delivery"\]'\)\.disabled=!state\.areas\.length/);
});
