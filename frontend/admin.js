import {API_BASE_URL} from './config.js';
const $=id=>document.getElementById(id);
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const statusNames={received:'Recebido',confirmed:'Confirmado',preparing:'Em preparo',out_for_delivery:'Saiu para entrega',delivered:'Concluído',cancelled:'Cancelado'};
const nextStatuses={received:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['out_for_delivery','delivered','cancelled'],out_for_delivery:['delivered'],delivered:[],cancelled:[]};
let token=null;
let acceptingOrders=false;
let categories=[];
async function api(path,options={}){
 const response=await fetch(API_BASE_URL+path,{...options,headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{}),...options.headers}});
 let data;try{data=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(!response.ok){if(response.status===401||response.status===403){logout()}throw Error(data.error||'Requisição recusada')}
 return data;
}
function logout(){
 token=null;
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
  card.append(top,customer,delivery,time,status);$('orders').append(card);
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
  await Promise.all([loadOrders(),loadStore(),loadCatalog()]);
 }catch(error){$('login-message').textContent=error.message;$('admin-message').textContent=error.message}
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
 $('product-category').replaceChildren();
 for(const category of categories.filter(c=>c.active)){
  const option=document.createElement('option');option.value=String(category.id);option.textContent=category.name;
  $('product-category').append(option);
 }
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
  row.append(name,makeToggle('products',product,loadCatalog));$('product-list').append(row);
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
$('product-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.currentTarget.querySelector('button');button.disabled=true;
 try{
  const data=new FormData(event.currentTarget);
  const price=Number(data.get('price'));
  if(!Number.isFinite(price)||price<0)throw Error('Preço inválido');
  await api('/admin/manage/products',{method:'POST',body:JSON.stringify({
   category_id:Number(data.get('category_id')),name:data.get('name').trim(),
   description:data.get('description').trim(),price_cents:Math.round(price*100),active:true
  })});
  event.currentTarget.reset();await loadCatalog();$('admin-message').textContent='Produto criado.';
 }catch(error){$('admin-message').textContent=error.message}finally{button.disabled=false}
});
