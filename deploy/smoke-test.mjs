// Smoke test HTTP da stack Docker, sem bibliotecas adicionais.
// Executado apenas no CI com credenciais fictícias.
import assert from 'node:assert/strict';

const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:8080/api';
async function request(path,method='GET',body,token){
 const res=await fetch(base+path,{
  method,
  headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await res.json();
 return {status:res.status,data};
}
const login=await request('/admin/login','POST',{
 email:process.env.SMOKE_ADMIN_EMAIL,
 password:process.env.SMOKE_ADMIN_PASSWORD
});
assert.equal(login.status,200,'Login administrativo deve funcionar');
const token=login.data.token;
assert.ok(token);
const category=await request('/admin/manage/categories','POST',{name:'Categoria Smoke',active:true},token);
assert.equal(category.status,201);
const product=await request('/admin/manage/products','POST',{
 category_id:category.data.id,name:'Burger Smoke',description:'Produto fictício',
 price_cents:2390,active:true
},token);
assert.equal(product.status,201);
assert.equal((await request('/admin/store','PATCH',{accepting_orders:true},token)).status,200);
const catalog=await request('/catalog');
assert.ok(catalog.data.products.some(p=>p.id===product.data.id));
const order=await request('/orders','POST',{
 customer_name:'Cliente Teste',customer_phone:'21999999999',
 fulfillment:'pickup',payment_method:'cash',
 items:[{product_id:product.data.id,quantity:2,addon_ids:[]}]
});
assert.equal(order.status,201,JSON.stringify(order.data));
assert.equal(order.data.total_cents,4780);
assert.equal(order.data.delivery_fee_cents,0);
const tracked=await request('/orders/'+order.data.order_id);
assert.equal(tracked.status,200);
assert.equal(tracked.data.status,'received');
assert.equal('customer_phone' in tracked.data,false);
const orders=await request('/admin/orders','GET',undefined,token);
const saved=orders.data.orders.find(o=>o.public_id===order.data.order_id);
assert.ok(saved);
assert.equal((await request('/admin/orders/'+saved.id+'/status','PATCH',{status:'confirmed'},token)).status,200);
assert.equal((await request('/admin/orders/'+saved.id+'/status','PATCH',{status:'preparing'},token)).status,200);
assert.equal((await request('/admin/orders/'+saved.id+'/status','PATCH',{status:'delivered'},token)).status,200);
assert.equal((await request('/orders/'+order.data.order_id)).data.status,'delivered');
assert.equal((await request('/admin/store','PATCH',{accepting_orders:false},token)).status,200);
console.log('SMOKE_ORDER_ID='+order.data.order_id);
console.log('Smoke test: login, catálogo, checkout, rastreio e status aprovados.');
