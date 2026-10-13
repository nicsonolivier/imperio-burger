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

test('logout descarta edição de produto e limpa o formulário',()=>{
 const logout=js.slice(js.indexOf('function logout(){'),js.indexOf('function displayOrders('));
 assert.match(logout,/editingProduct=null/);
 assert.match(logout,/\$\('product-form'\)\.reset\(\)/);
 assert.match(logout,/\$\('product-cancel'\)\.hidden=true/);
});

test('atualização do catálogo preserva a categoria selecionada no formulário',()=>{
 assert.match(js,/const selectedCategory=\$\('product-category'\)\.value/);
 assert.match(js,/option\.value===selectedCategory/);
 assert.match(js,/\$\('product-category'\)\.value=selectedCategory/);
});

test('preço de produto respeita limite e centavos do backend',()=>{
 assert.match(js,/price>10000/);
 assert.match(js,/Math\.abs\(price\*100-Math\.round\(price\*100\)\)>1e-7/);
 assert.match(js,/price_cents:Math\.round\(price\*100\)/);
});

test('recarregar catálogo sincroniza estado do produto em edição',()=>{
 assert.match(js,/productData\.items\.find\(product=>product\.id===editingProduct\.id\)/);
 assert.match(js,/if\(latest\)editingProduct=latest/);
 assert.match(js,/else\{editingProduct=null/);
});

test('painel detalha preços dos itens e adicionais de cada pedido',()=>{
 assert.match(js,/money\(basePrice\)/);
 assert.match(js,/money\(addon\.price_cents\)/);
 assert.match(js,/const lineTotal=item\.unit_price_cents\*item\.quantity/);
 assert.match(js,/\*item\.quantity/);
 assert.match(js,/money\(lineTotal\)/);
});

test('painel mostra subtotal e total retornados pela API sem inferir descontos',()=>{
 assert.match(js,/money\(order\.subtotal_cents\)/);
 assert.match(js,/money\(order\.total_cents\)/);
 assert.match(js,/items,summary,status/);
});

test('painel detalha desconto e taxa de entrega persistidos no pedido',()=>{
 assert.match(js,/money\(order\.discount_cents\)/);
 assert.match(js,/money\(order\.delivery_fee_cents\)/);
 assert.match(js,/money\(order\.subtotal_cents\)/);
 assert.match(js,/money\(order\.total_cents\)/);
});

test('valores comerciais rejeitam frações de centavo',()=>{
 assert.match(js,/Math\.abs\(value\*100-Math\.round\(value\*100\)\)>1e-7/);
 assert.match(js,/price_cents:parseCents\(data\.get\('price'\)\)/);
 assert.match(js,/fee_cents:parseCents\(data\.get\('fee'\)\)/);
});

test('login diferencia autenticação de falhas parciais no carregamento inicial',()=>{
 assert.match(js,/Promise\.allSettled\(\[loadOrders\(\),loadStore\(\),loadCatalog\(\),loadCommercial\(\)\]\)/);
 assert.match(js,/if\(failed&&token\)/);
 assert.match(js,/Login realizado, mas alguns dados não carregaram/);
});

test('controle de abertura da loja é liberado após sucesso ou erro',()=>{
 const start=js.indexOf("$('store-toggle').addEventListener('click'");
 const end=js.indexOf('function makeToggle',start);
 const handler=js.slice(start,end);
 assert.match(handler,/finally\{button\.disabled=false\}/);
});

test('painel permite editar adicionais sem alterar estado ativo',()=>{
 assert.match(html,/id="addon-submit"/);
 assert.match(html,/id="addon-cancel"/);
 assert.match(js,/editingAddon=item/);
 assert.match(js,/if\(editing\)payload\.active=Boolean\(editing\.active\)/);
 assert.match(js,/method:editing\?'PUT':'POST'/);
 assert.match(js,/function cancelAddonEdit\(\)/);
});

test('painel permite editar e cancelar cupons sem alterar ativação',()=>{
 assert.match(html,/id="coupon-submit"/);
 assert.match(html,/id="coupon-cancel"/);
 assert.match(js,/editingCoupon=item/);
 assert.match(js,/if\(editingCoupon\)/);
 assert.match(js,/function cancelCouponEdit\(\)/);
 assert.match(js,/resource==='coupons'\?editingCoupon:/);
 assert.match(js,/if\(editing\)payload\.active=Boolean\(editing\.active\)/);
});

test('painel permite editar regiões e taxas de entrega preservando ativação',()=>{
 assert.match(html,/id="area-submit"/);
 assert.match(html,/id="area-cancel"/);
 assert.match(js,/editingArea=item/);
 assert.match(js,/if\(editingArea\)/);
 assert.match(js,/function cancelAreaEdit\(\)/);
 assert.match(js,/resource==='delivery-areas'\?editingArea:null/);
 assert.match(js,/if\(editing\)payload\.active=Boolean\(editing\.active\)/);
});

test('controles de ativação comercial são liberados após sucesso ou falha',()=>{
 const start=js.indexOf('function makeToggle(');
 const end=js.indexOf('async function loadCatalog',start);
 const handler=js.slice(start,end);
 assert.match(handler,/finally\{button\.disabled=false\}/);
});

test('edição de categorias preserva ativação e permite cancelar',()=>{
 assert.match(html,/id="category-submit"/);
 assert.match(html,/id="category-cancel"/);
 assert.match(js,/editingCategory=category/);
 assert.match(js,/function cancelCategoryEdit\(\)/);
 assert.match(js,/method:editing\?'PUT':'POST'/);
 assert.match(js,/active:editing\?Boolean\(editing\.active\):true/);
});

test('respostas de autenticação sem JSON também encerram sessões expiradas',()=>{
 const handler=js.slice(js.indexOf('async function api('),js.indexOf('function logout(){'));
 assert.match(handler,/catch\{data=null\}/);
 assert.ok(handler.indexOf('if(!response.ok)')<handler.indexOf("if(!data)throw Error('Resposta inválida do servidor')"));
 assert.match(handler,/data\?\.error/);
});

test('total de linha não duplica preços de adicionais já incluídos no unitário',()=>{
 assert.match(js,/const addonsCents=\(item\.addons\|\|\[\]\)\.reduce/);
 assert.match(js,/const basePrice=item\.unit_price_cents-addonsCents/);
 assert.match(js,/const lineTotal=item\.unit_price_cents\*item\.quantity/);
 assert.doesNotMatch(js,/const lineTotal=\(item\.unit_price_cents\+/);
});

test('atualização de status exige seleção explícita',()=>{
 assert.match(js,/placeholder\.textContent='Selecione o novo status'/);
 assert.match(js,/placeholder\.disabled=true;placeholder\.selected=true/);
 assert.match(js,/save\.disabled=true;\s*select\.addEventListener\('change'/);
 assert.match(js,/if\(!select\.value\)return;save\.disabled=true/);
});
