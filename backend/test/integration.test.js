import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {once} from 'node:events';

async function freePort(){
 const server=createServer();
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 const port=server.address().port;
 await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
 return port;
}
test('fluxo HTTP real: autenticação, gestão, cupom, frete e pedido', {timeout:30000},async t=>{
 const dir=mkdtempSync(join(tmpdir(),'imperio-api-'));
 const port=await freePort();
 const child=spawn(process.execPath,['src/server.js'],{
  cwd:process.cwd(),stdio:['ignore','pipe','pipe'],
  env:{...process.env,PORT:String(port),DATABASE_PATH:join(dir,'test.sqlite'),JWT_SECRET:'integration-tests-only-secret-32-characters',ADMIN_EMAIL:'test@example.com',ADMIN_PASSWORD:'test-password-very-strong',CORS_ORIGIN:'http://localhost:5500'}
 });
 let stderr='';
 child.stderr.on('data',chunk=>{stderr+=chunk.toString()});
 t.after(()=>{child.kill();rmSync(dir,{recursive:true,force:true})});
 const base='http://127.0.0.1:'+port;
 async function request(path,method='GET',body,token){
  const res=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  return {status:res.status,data:await res.json()};
 }
 let ready=false;
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)break;
  try{const health=await request('/api/health');if(health.status===200){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 assert.ok(ready,'API não iniciou: '+stderr);
 assert.equal((await request('/api/admin/orders')).status,401);
 assert.equal((await request('/api/admin/login','POST',{email:'test@example.com',password:'wrong'})).status,401);
 const login=await request('/api/admin/login','POST',{email:'test@example.com',password:'test-password-very-strong'});
 assert.equal(login.status,200);
 const token=login.data.token;
 const catalog=await request('/api/catalog');
 assert.equal(catalog.status,200);
 assert.ok(catalog.data.products.length>0);
 const item=catalog.data.products[0];
 const payload={customer_name:'Cliente Teste',customer_phone:'21999999999',fulfillment:'pickup',payment_method:'pix',items:[{product_id:item.id,quantity:2}]};
 assert.equal((await request('/api/orders','POST',payload)).status,503);
 const extra=await request('/api/admin/manage/addons','POST',{name:'Bacon Extra',price_cents:500,active:true},token);
 assert.equal(extra.status,201);
 const coupon=await request('/api/admin/manage/coupons','POST',{code:'TESTE10',percent_off:10,active:true},token);
 assert.equal(coupon.status,201);
 const area=await request('/api/admin/manage/delivery-areas','POST',{name:'Centro',fee_cents:700,active:true},token);
 assert.equal(area.status,201);
 assert.equal((await request('/api/admin/store','PATCH',{accepting_orders:true},token)).status,200);
 const order=await request('/api/orders','POST',{...payload,fulfillment:'delivery',address:'Rua das Flores 123',delivery_area_id:area.data.id,coupon:'TESTE10',items:[{product_id:item.id,quantity:2,addon_ids:[extra.data.id]}]});
 assert.equal(order.status,201,JSON.stringify(order.data));
 const subtotal=(item.price_cents+500)*2;
 assert.equal(order.data.subtotal_cents,subtotal);
 assert.equal(order.data.discount_cents,Math.round(subtotal*.1));
 assert.equal(order.data.delivery_fee_cents,700);
 assert.equal(order.data.total_cents,subtotal-Math.round(subtotal*.1)+700);
 const tracked=await request('/api/orders/'+order.data.order_id);
 assert.equal(tracked.status,200);
 assert.equal(tracked.data.total_cents,order.data.total_cents);
 assert.equal((await request('/api/orders','POST',{...payload,items:[{product_id:999999,quantity:1}]})).status,400);
 assert.equal((await request('/api/orders','POST',{...payload,items:[{product_id:String(item.id),quantity:1}]})).status,400);
 assert.equal((await request('/api/orders','POST',{...payload,items:[{product_id:item.id,quantity:1,addon_ids:[extra.data.id,extra.data.id]}]})).status,400);
 assert.equal((await request('/api/orders','POST',{...payload,coupon:'NAOEXISTE'})).status,400);
 assert.equal((await request('/api/orders','POST',{...payload,address:'Rua das Flores 123'})).status,400);
 assert.equal((await request('/api/orders','POST',{...payload,fulfillment:'delivery',address:'Rua das Flores 123',delivery_area_id:999999})).status,400);
 assert.equal((await request('/api/admin/manage/products','POST',{category_id:'1',name:'Invalido',description:'',price_cents:100,active:true},token)).status,400);
 assert.equal((await request('/api/admin/manage/products','POST',{category_id:999999,name:'Invalido',description:'',price_cents:100,active:true},token)).status,400);
 assert.equal((await request('/api/admin/manage/addons','POST',{name:'Bacon Extra',price_cents:500,active:true},token)).status,409);
 assert.equal((await request('/api/admin/store','PATCH',{accepting_orders:false},token)).status,200);
 assert.equal((await request('/api/orders','POST',payload)).status,503);
});
