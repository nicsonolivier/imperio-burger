import {API_BASE_URL} from './config.js';
const $=id=>document.getElementById(id);
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const statusNames={received:'Recebido',confirmed:'Confirmado',preparing:'Em preparo',out_for_delivery:'Saiu para entrega',delivered:'Concluído',cancelled:'Cancelado'};
const nextStatuses={received:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['out_for_delivery','delivered','cancelled'],out_for_delivery:['delivered'],delivered:[],cancelled:[]};
let token=null;
let acceptingOrders=false;
let categories=[];
let editingProduct=null;
async function api(path,options={}){
 const sessionToken=token;
 const response=await fetch(API_BASE_URL+path,{...options,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...options.headers}});
 let data;try{data=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(sessionToken!==token)throw Error('Sessão alterada. Atualize após entrar novamente.');
 if(!response.ok){if(sessionToken&&(response.status===401||response.status===403)){logout();$('login-message').textContent='Sessão encerrada. Entre novamente.'}throw Error(data.error||'Requisição recusada')}
 return data;
}
function logout(){
 token=null;
 for(const id of ['orders','category-list','product-list','addon-list','coupon-list','area-list'])$(id).replaceChildren();
 categories=[];
 acceptingOrders=false;
 editingProduct=null;
 $('product-form').reset();
 $('product-submit').textContent='Criar produto';
 $('product-cancel').hidden=true;
 $('admin-message').textContent='';
 $('dashboard').hidden=true;$('login-view').hidden=false;$('logout').hidden=true;
 $('login-form').reset();
}
function displayOrders(orders){
 $('orders').replaceChildren();
 if(!orders.length){const empty=document.createElement('p');empty.textContent='Nenhum pedido registrado.';$('orders').append(empty);return}
 for(const order of orders){
  const card=document.createElement('article');card.className='order';
  const top=document.createElement('div');top.className='order-top';
  const title=document.createElement('h2');title.textContent='Pedido #'+order.id;
  const total=document.createElement('strong');total.textContent=money(order.total_cents);
  top.append(title,total);
  const summary=document.createElement('p');summary.textContent='Subtotal: '+money(order.subtotal_cents)+' · Desconto: -'+money(order.discount_cents)+' · Entrega: '+money(order.delivery_fee_cents)+' · Total cobrado: '+money(order.total_cents);
  const customer=document.createElement('p');customer.textContent=order.customer_name+' · '+order.customer_phone;
  const delivery=document.createElement('p');delivery.textContent=(order.fulfillment==='delivery'?'Entrega: '+(order.address||'Endereço não informado'):'Retirada')+' · '+order.payment_method;
  const time=document.createElement('p');time.textContent='Criado em: '+order.created_at;
  const status=document.createElement('div');status.className='status';
  const current=document.createElement('strong');current.textContent='Status: '+(statusNames[order.status]||order.status);
  const allowed=(nextStatuses[order.status]||[]).filter(s=>s!=='out_for_delivery'||order.fulfillment==='delivery');
  status.append(current);
  if(allowed.length){
   const label=document.createElement('label');label.textContent='Alterar status';
   const select=document.createElement('select');select.setAttribute('aria-label','Novo status do pedido '+order.id);
   for(const value of allowed){const option=document.createElement('option');option.value=value;option.textContent=statusNames[value];select.append(option)}
   label.append(select);
   const save=document.createElement('button');save.type='button';save.textContent='Atualizar';
   save.addEventListener('click',async()=>{save.disabled=true;try{await api('/admin/orders/'+order.id+'/status',{method:'PATCH',body:JSON.stringify({status:select.value})});$('admin-message').textContent='Pedido #'+order.id+' atualizado.';await loadOrders()}catch(error){$('admin-message').textContent=error.message}finally{save.disabled=false}});
   status.append(label,save);
  }
  const items=document.createElement('ul');items.className='order-items';
  for(const item of order.items||[]){
   const li=document.createElement('li');
   const product=document.createElement('strong');product.textContent=item.quantity+'× '+item.product_name;
   li.append(product);
   const unitPrice=document.createElement('span');unitPrice.textContent=' · '+money(item.unit_price_cents)+' cada';li.append(unitPrice);
   for(const addon of item.addons||[]){
    const detail=document.createElement('span');
    detail.textContent=' + '+addon.addon_name+' ('+money(addon.price_cents)+')';
    li.append(detail);
   }
   const lineTotal=(item.unit_price_cents+(item.addons||[]).reduce((sum,addon)=>sum+addon.price_cents,0))*item.quantity;
   const lineAmount=document.createElement('strong');lineAmount.textContent=' · Total: '+money(lineTotal);li.append(lineAmount);
   items.append(li);
  }
  card.append(top,customer,delivery,time,items,summary,status);$('orders').append(card);
 }
}
async function loadOrders(){
 const data=await api('/admin/orders');
 displayOrders(data.orders);
}
async function loadStore(){
 const data=await api('/store');
 acceptingOrders=data.accepting_orders;
 $('store-state').textContent=acceptingOrders?'Aberta para pedidos':'Fechada para pedidos';
 $('store-toggle').textContent=acceptingOrders?'Fechar loja':'Abrir loja';
 $('store-toggle').disabled=false;
}
$('login-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
 $('login-message').textContent='Autenticando...';
 const data=new FormData(event.currentTarget);
 try{
  const result=await api('/admin/login',{method:'POST',body:JSON.stringify({email:data.get('email'),password:data.get('password')})});
  token=result.token;
  $('login-view').hidden=true;$('dashboard').hidden=false;$('logout').hidden=false;
  $('login-message').textContent='';
  await Promise.all([loadOrders(),loadStore(),loadCatalog(),loadCommercial()]);
 }catch(error){$('login-message').textContent=error.message;$('admin-message').textContent=error.message;event.currentTarget.querySelector('[name="password"]').value=''}
 finally{button.disabled=false}
});
$('logout').addEventListener('click',logout);
$('refresh').addEventListener('click',async()=>{try{await Promise.all([loadOrders(),loadStore()]);$('admin-message').textContent='Pedidos atualizados.'}catch(error){$('admin-message').textContent=error.message}});
$('store-toggle').addEventListener('click',async()=>{
 const button=$('store-toggle');button.disabled=true;
 try{
  await api('/admin/store',{method:'PATCH',body:JSON.stringify({accepting_orders:!acceptingOrders})});
  await loadStore();$('admin-message').textContent='Status da loja atualizado.';
 }catch(error){$('admin-message').textContent=error.message;button.disabled=false}
});

function makeToggle(resource,item,after){
 const button=document.createElement('button');button.type='button';
 button.textContent=item.active?'Desativar':'Ativar';
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   await api('/admin/manage/'+resource+'/'+item.id+'/active',{method:'PATCH',body:JSON.stringify({active:!Boolean(item.active)})});
   $('admin-message').textContent='Cadastro atualizado.';
   await after();
  }catch(error){$('admin-message').textContent=error.message;button.disabled=false}
 });
 return button;
}
async function loadCatalog(){
 const [categoryData,productData]=await Promise.all([api('/admin/manage/categories'),api('/admin/manage/products')]);
 categories=categoryData.items;
 if(editingProduct){
  const latest=productData.items.find(product=>product.id===editingProduct.id);
  if(latest)editingProduct=latest;
  else{editingProduct=null;$('product-form').reset();$('product-submit').textContent='Criar produto';$('product-cancel').hidden=true;}
 }
 const selectedCategory=$('product-category').value;
 $('product-category').replaceChildren();
 for(const category of categories.filter(c=>c.active||c.id===editingProduct?.category_id)){
  const option=document.createElement('option');option.value=String(category.id);option.textContent=category.name;
  $('product-category').append(option);
 }
 if([...$('product-category').options].some(option=>option.value===selectedCategory))$('product-category').value=selectedCategory;
 $('category-list').replaceChildren();
 for(const category of categories){
  const row=document.createElement('div');row.className='manage-row';
  const name=document.createElement('span');name.textContent=category.name+(category.active?'':' (inativa)');
  row.append(name,makeToggle('categories',category,loadCatalog));$('category-list').append(row);
 }
 $('product-list').replaceChildren();
 for(const product of productData.items){
  const row=document.createElement('div');row.className='manage-row';
  const name=document.createElement('span');
  name.textContent=product.name+' · '+money(product.price_cents)+' · '+(categories.find(c=>c.id===product.category_id)?.name||'Sem categoria')+(product.active?'':' (inativo)');
  const edit=document.createElement('button');edit.type='button';edit.textContent='Editar';
  edit.addEventListener('click',()=>{
   editingProduct=product;
   const form=$('product-form');form.elements.namedItem('name').value=product.name;
   form.elements.namedItem('description').value=product.description||'';
   form.elements.namedItem('price').value=(product.price_cents/100).toFixed(2);
   $('product-category').replaceChildren();
   for(const category of categories.filter(c=>c.active||c.id===product.category_id)){
    const option=document.createElement('option');option.value=String(category.id);option.textContent=category.name;$('product-category').append(option);
   }
   $('product-category').value=String(product.category_id);
   $('product-submit').textContent='Salvar alterações';$('product-cancel').hidden=false;
   form.scrollIntoView({behavior:'smooth',block:'center'});
  });
  row.append(name,edit,makeToggle('products',product,loadCatalog));$('product-list').append(row);
 }
}
$('catalog-refresh').addEventListener('click',async()=>{try{await loadCatalog();$('admin-message').textContent='Cardápio atualizado.'}catch(error){$('admin-message').textContent=error.message}});
$('category-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const data=new FormData(event.currentTarget);
  await api('/admin/manage/categories',{method:'POST',body:JSON.stringify({name:data.get('name').trim(),active:true})});
  event.currentTarget.reset();await loadCatalog();$('admin-message').textContent='Categoria criada.';
 }catch(error){$('admin-message').textContent=error.message}finally{button.disabled=false}
});
$('product-cancel').addEventListener('click',()=>{editingProduct=null;$('product-form').reset();$('product-submit').textContent='Criar produto';$('product-cancel').hidden=true;loadCatalog().catch(error=>{$('admin-message').textContent=error.message})});
$('product-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const data=new FormData(event.currentTarget);
  const price=Number(data.get('price'));
  if(!Number.isFinite(price)||price<0||price>10000||Math.abs(price*100-Math.round(price*100))>1e-7)throw Error('Preço inválido: use valor entre R$ 0,00 e R$ 10.000,00 com até duas casas decimais');
  await api('/admin/manage/products'+(editingProduct?'/'+editingProduct.id:''),{method:editingProduct?'PUT':'POST',body:JSON.stringify({
   category_id:Number(data.get('category_id')),name:data.get('name').trim(),
   description:data.get('description').trim(),price_cents:Math.round(price*100),active:editingProduct?Boolean(editingProduct.active):true
  })});
  const updated=Boolean(editingProduct);editingProduct=null;event.currentTarget.reset();$('product-submit').textContent='Criar produto';$('product-cancel').hidden=true;await loadCatalog();$('admin-message').textContent=updated?'Produto atualizado.':'Produto criado.';
 }catch(error){$('admin-message').textContent=error.message}finally{button.disabled=false}
});

function parseCents(raw){
 const value=Number(raw);
 if(!Number.isFinite(value)||value<0||value>10000||Math.abs(value*100-Math.round(value*100))>1e-7)throw Error('Valor monetário inválido: use até duas casas decimais, entre R$ 0,00 e R$ 10.000,00');
 return Math.round(value*100);
}
async function loadCommercial(){
 const resources=[
  {path:'addons',list:'addon-list',label:item=>item.name+' · '+money(item.price_cents)},
  {path:'coupons',list:'coupon-list',label:item=>item.code+' · '+item.percent_off+'% de desconto'},
  {path:'delivery-areas',list:'area-list',label:item=>item.name+' · '+money(item.fee_cents)}
 ];
 const responses=await Promise.all(resources.map(resource=>api('/admin/manage/'+resource.path)));
 resources.forEach((resource,index)=>{
  const container=$(resource.list);container.replaceChildren();
  for(const item of responses[index].items){
   const row=document.createElement('div');row.className='manage-row';
   const label=document.createElement('span');label.textContent=resource.label(item)+(item.active?'':' (inativo)');
   row.append(label,makeToggle(resource.path,item,loadCommercial));container.append(row);
  }
 });
}
function registerCommercialForm(formId,resource,build){
 $(formId).addEventListener('submit',async event=>{
  event.preventDefault();
  const button=event.currentTarget.querySelector('button');button.disabled=true;
  try{
   const data=new FormData(event.currentTarget);
   await api('/admin/manage/'+resource,{method:'POST',body:JSON.stringify(build(data))});
   event.currentTarget.reset();await loadCommercial();
   $('admin-message').textContent='Cadastro criado com sucesso.';
  }catch(error){$('admin-message').textContent=error.message}finally{button.disabled=false}
 });
}
registerCommercialForm('addon-form','addons',data=>({
 name:data.get('name').trim(),price_cents:parseCents(data.get('price')),active:true
}));
registerCommercialForm('coupon-form','coupons',data=>({
 code:data.get('code').trim().toUpperCase(),percent_off:Number(data.get('percent_off')),active:true
}));
registerCommercialForm('area-form','delivery-areas',data=>({
 name:data.get('name').trim(),fee_cents:parseCents(data.get('fee')),active:true
}));
$('commercial-refresh').addEventListener('click',async()=>{
 try{await loadCommercial();$('admin-message').textContent='Cadastros comerciais atualizados.'}
 catch(error){$('admin-message').textContent=error.message}
});
