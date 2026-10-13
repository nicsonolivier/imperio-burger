import {API_BASE_URL} from './config.js';
const $=id=>document.getElementById(id);
const money=cents=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
const state={products:[],categories:[],addons:[],areas:[],cart:[],open:false,category:null,submitting:false};
async function api(path,options={}){
 const response=await fetch(API_BASE_URL+path,{...options,headers:{'content-type':'application/json',...options.headers}});
 let body;
 try{body=await response.json()}catch{throw Error('Resposta inválida do servidor')}
 if(!response.ok)throw Error(body.error||'Erro ao comunicar com o servidor');
 return body;
}
function showCart(open){
 $('cart').classList.toggle('open',open);
 $('cart').setAttribute('aria-hidden',String(!open));
 $('overlay').hidden=!open;
}
function renderCatalog(){
 $('categories').replaceChildren();
 for(const category of [{id:null,name:'Todos'},...state.categories]){
  const button=document.createElement('button');
  button.type='button';button.textContent=category.name;
  button.classList.toggle('active',state.category===category.id);
  button.addEventListener('click',()=>{state.category=category.id;renderCatalog()});
  $('categories').append(button);
 }
 $('products').replaceChildren();
 for(const product of state.products.filter(p=>state.category===null||p.category_id===state.category)){
  const card=document.createElement('article');card.className='product';
  const symbol=document.createElement('div');symbol.className='symbol';symbol.textContent='🍔';
  const title=document.createElement('h3');title.textContent=product.name;
  const desc=document.createElement('p');desc.textContent=product.description||'Preparado com carinho.';
  const bottom=document.createElement('div');bottom.className='bottom';
  const price=document.createElement('span');price.className='price';price.textContent=money(product.price_cents);
  const add=document.createElement('button');add.type='button';add.textContent='Adicionar';add.disabled=!state.open;
  add.addEventListener('click',()=>{const existing=state.cart.find(x=>x.product_id===product.id);if(existing)existing.quantity=Math.min(30,existing.quantity+1);else state.cart.push({product_id:product.id,quantity:1,addon_ids:[]});renderCart();showCart(true)});
  bottom.append(price,add);card.append(symbol,title,desc,bottom);$('products').append(card);
 }
}
function renderCart(){
 $('cart-items').replaceChildren();
 let subtotal=0,count=0;
 for(const line of state.cart){
  const product=state.products.find(p=>p.id===line.product_id);
  if(!product)continue;
  count+=line.quantity;
  subtotal+=line.quantity*(product.price_cents+line.addon_ids.reduce((sum,id)=>sum+(state.addons.find(a=>a.id===id)?.price_cents||0),0));
  const row=document.createElement('div');row.className='cart-line';
  const details=document.createElement('div');const name=document.createElement('strong');name.textContent=product.name;
  const info=document.createElement('small');info.textContent=money(product.price_cents)+' cada';
  details.append(name,info);
  if(state.addons.length){
   const extras=document.createElement('select');extras.setAttribute('aria-label','Adicionar extra para '+product.name);
   const empty=document.createElement('option');empty.value='';empty.textContent='Adicionar extra...';extras.append(empty);
   for(const addon of state.addons.filter(a=>!line.addon_ids.includes(a.id))){const option=document.createElement('option');option.value=String(addon.id);option.textContent=addon.name+' +'+money(addon.price_cents);extras.append(option)}
   extras.addEventListener('change',()=>{if(extras.value&&line.addon_ids.length<12){line.addon_ids.push(Number(extras.value));renderCart()}});
   details.append(extras);
   for(const id of line.addon_ids){const addon=state.addons.find(a=>a.id===id);if(!addon)continue;const remove=document.createElement('button');remove.type='button';remove.textContent='✕ '+addon.name;remove.addEventListener('click',()=>{line.addon_ids=line.addon_ids.filter(x=>x!==id);renderCart()});details.append(remove)}
  }
  const actions=document.createElement('div');actions.className='cart-line-actions';
  const minus=document.createElement('button');minus.type='button';minus.textContent='−';minus.setAttribute('aria-label','Remover unidade');minus.addEventListener('click',()=>{line.quantity--;if(line.quantity===0)state.cart=state.cart.filter(x=>x!==line);renderCart()});
  const quantity=document.createElement('span');quantity.textContent=String(line.quantity);
  const plus=document.createElement('button');plus.type='button';plus.textContent='+';plus.setAttribute('aria-label','Adicionar unidade');plus.disabled=line.quantity>=30;plus.addEventListener('click',()=>{line.quantity++;renderCart()});
  actions.append(minus,quantity,plus);row.append(details,actions);$('cart-items').append(row);
 }
 if(!count){const empty=document.createElement('p');empty.textContent='Seu carrinho está vazio.';$('cart-items').append(empty)}
 $('cart-count').textContent=String(count);$('subtotal').textContent=money(subtotal);
 const delivery=$('fulfillment').value==='delivery';
 const area=state.areas.find(a=>String(a.id)===$('delivery-area').value);
 const fee=delivery&&area?area.fee_cents:0;
 $('delivery-fee').textContent=delivery?(area?money(fee):'Selecione a região'):money(0);
 $('total').textContent=money(subtotal+fee);
 $('submit-order').disabled=!count||!state.open||state.submitting;
}
function updateFulfillment(){
 const delivery=$('fulfillment').value==='delivery';
 $('delivery-fields').hidden=!delivery;
 $('address').required=delivery;
 $('delivery-area').required=delivery;
 renderCart();
}
const statusLabels={received:'Recebido',confirmed:'Confirmado',preparing:'Em preparo',out_for_delivery:'Saiu para entrega',delivered:'Concluído',cancelled:'Cancelado'};
async function trackOrder(id){
 const value=id.trim();
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)){
  $('tracking-result').textContent='Informe um código de pedido válido.';
  return;
 }
 $('tracking-result').textContent='Consultando pedido...';
 try{
  const order=await api('/orders/'+encodeURIComponent(value));
  $('tracking-result').textContent='Status: '+(statusLabels[order.status]||order.status)+' · Total: '+money(order.total_cents);
 }catch(error){$('tracking-result').textContent=error.message}
}
async function init(){
 $('tracking-form').addEventListener('submit',event=>{
  event.preventDefault();
  trackOrder($('tracking-id').value);
 });
 $('cart-toggle').addEventListener('click',()=>showCart(true));
 $('cart-close').addEventListener('click',()=>showCart(false));
 $('overlay').addEventListener('click',()=>showCart(false));
 $('fulfillment').addEventListener('change',updateFulfillment);
 $('delivery-area').addEventListener('change',renderCart);
 $('checkout').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!state.cart.length||!state.open||state.submitting)return;
  state.submitting=true;
  const button=$('submit-order');button.disabled=true;
  $('checkout-message').textContent='Enviando pedido...';
  const data=new FormData(event.currentTarget);
  const fulfillment=data.get('fulfillment');
  const payload={customer_name:data.get('customer_name'),customer_phone:data.get('customer_phone'),fulfillment,payment_method:data.get('payment_method'),items:state.cart.map(x=>({...x}))};
  if(fulfillment==='delivery'){payload.address=data.get('address');payload.delivery_area_id=Number(data.get('delivery_area_id'))}
  if(data.get('coupon')?.trim())payload.coupon=data.get('coupon').trim();
  try{
   const order=await api('/orders',{method:'POST',body:JSON.stringify(payload)});
   state.cart=[];renderCart();
   $('checkout-message').replaceChildren();
   const message=document.createElement('span');message.textContent='Pedido recebido! Total: '+money(order.total_cents)+'. ';
   $('tracking-id').value=order.order_id;
   const track=document.createElement('a');track.href='#tracking';track.textContent='Acompanhar pedido';track.addEventListener('click',()=>{showCart(false);trackOrder(order.order_id)});
   $('checkout-message').append(message,track);

  }catch(error){$('checkout-message').textContent=error.message}
  finally{state.submitting=false;button.disabled=!state.open||!state.cart.length}
 });
 try{
  const [store,catalog]=await Promise.all([api('/store'),api('/catalog')]);
  state.open=store.accepting_orders;
  state.products=catalog.products;state.categories=catalog.categories;state.addons=catalog.addons;state.areas=catalog.delivery_areas;
  $('store-badge').textContent=state.open?'🟢 Aberto para pedidos':'🔴 Pedidos indisponíveis';
  $('catalog-status').textContent=state.products.length+' produtos disponíveis';
  $('delivery-area').replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Selecione sua região';$('delivery-area').append(placeholder);
  for(const area of state.areas){const option=document.createElement('option');option.value=String(area.id);option.textContent=area.name+' · '+money(area.fee_cents);$('delivery-area').append(option)}
  renderCatalog();updateFulfillment();
 }catch(error){$('catalog-status').textContent='Não foi possível carregar o cardápio: '+error.message;$('store-badge').textContent='API indisponível'}
}
init();
