import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomUUID} from 'node:crypto';
import {z,ZodError} from 'zod';
import {db,initAdmin} from './db.js';
import {management} from './management.js';

if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32)throw Error('Configure JWT_SECRET com no mínimo 32 caracteres');
initAdmin();
const app=express();
app.disable('x-powered-by');
app.use(helmet());
const allow=(process.env.CORS_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({origin:(origin,cb)=>cb(null,!origin||allow.includes(origin))}));
app.use(express.json({limit:'32kb'}));
app.use('/api',rateLimit({windowMs:15*60*1000,limit:120,standardHeaders:'draft-7',legacyHeaders:false}));
const auth=(req,res,next)=>{
 const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
 if(!token)return res.status(401).json({error:'Login necessário'});
 try{req.user=jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256']});if(req.user.role!=='admin')return res.status(403).json({error:'Sem permissão'});next()}
 catch{return res.status(401).json({error:'Token inválido'})}
};
const logAudit=db.prepare('INSERT INTO audit_logs(admin_id,action,entity_type,entity_id,details) VALUES(?,?,?,?,?)');
const transitions={
 received:['confirmed','cancelled'],
 confirmed:['preparing','cancelled'],
 preparing:['out_for_delivery','delivered','cancelled'],
 out_for_delivery:['delivered'],
 delivered:[],
 cancelled:[]
};
const asId=z.number().int().positive();
const routeId=z.coerce.number().int().positive();
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
app.get('/api/catalog',(_req,res)=>res.json({
 categories:db.prepare('SELECT id,name FROM categories WHERE active=1').all(),
 products:db.prepare('SELECT id,category_id,name,description,price_cents FROM products WHERE active=1').all(),
 addons:db.prepare('SELECT id,name,price_cents FROM addons WHERE active=1').all(),
 delivery_areas:db.prepare('SELECT id,name,fee_cents FROM delivery_areas WHERE active=1').all()
}));
app.post('/api/admin/login',rateLimit({windowMs:15*60*1000,limit:10}),(req,res,next)=>{try{
 const credentials=z.object({email:z.string().email(),password:z.string().min(1)}).parse(req.body);
 const a=db.prepare('SELECT * FROM admins WHERE email=?').get(credentials.email.toLowerCase());
 if(!a||!bcrypt.compareSync(credentials.password,a.password_hash))return res.status(401).json({error:'Credenciais inválidas'});
 res.json({token:jwt.sign({sub:String(a.id),role:'admin'},process.env.JWT_SECRET,{expiresIn:'2h',algorithm:'HS256'})});
}catch(e){next(e)}});
const orderSchema=z.object({
 customer_name:z.string().trim().min(2).max(100),
 customer_phone:z.string().trim().min(10).max(22),
 fulfillment:z.enum(['pickup','delivery']),
 address:z.string().trim().max(250).optional(),
 payment_method:z.enum(['pix','cash','debit','credit']),
 delivery_area_id:asId.optional(),
 coupon:z.string().trim().max(40).optional(),
 items:z.array(z.object({product_id:asId,quantity:z.number().int().min(1).max(30),addon_ids:z.array(asId).max(12).default([])}).strict()).min(1).max(30)
}).strict();
app.post('/api/orders',rateLimit({windowMs:15*60*1000,limit:15}),(req,res,next)=>{try{
 const input=orderSchema.parse(req.body);
 if(!db.prepare('SELECT accepting_orders FROM store_settings WHERE id=1').get()?.accepting_orders)return res.status(503).json({error:'Loja fechada'});
 if(input.fulfillment==='pickup'&&(input.delivery_area_id!==undefined||input.address!==undefined))return res.status(400).json({error:'Retirada não aceita endereço ou região de entrega'});
 if(input.fulfillment==='delivery'&&(!input.address||input.address.length<8||!input.delivery_area_id))return res.status(400).json({error:'Informe endereço válido'});
 const result=db.transaction(()=>{
 let subtotal=0;
 const lines=input.items.map(line=>{
 const p=db.prepare('SELECT id,name,price_cents FROM products WHERE id=? AND active=1').get(line.product_id);
 if(!p)throw Object.assign(new Error('Produto indisponível'),{status:400});
 if(new Set(line.addon_ids).size!==line.addon_ids.length)throw Object.assign(new Error('Adicionais repetidos'),{status:400});
 const addons=line.addon_ids.map(id=>db.prepare('SELECT id,name,price_cents FROM addons WHERE id=? AND active=1').get(id));
 if(addons.some(a=>!a))throw Object.assign(new Error('Adicional indisponível'),{status:400});
 const unit=p.price_cents+addons.reduce((sum,a)=>sum+a.price_cents,0);
 subtotal+=unit*line.quantity;
 return {...line,product:p,addons,unit};
 });
 if(subtotal<=0||subtotal>10000000)throw Object.assign(new Error('Valor do pedido inválido'),{status:400});
 let deliveryFee=0,areaId=null;
 if(input.fulfillment==='delivery'){
 const area=db.prepare('SELECT id,fee_cents FROM delivery_areas WHERE id=? AND active=1').get(input.delivery_area_id);
 if(!area)throw Object.assign(new Error('Área de entrega indisponível'),{status:400});
 areaId=area.id;deliveryFee=area.fee_cents;
 }
 let discount=0;
 if(input.coupon){
 const coupon=db.prepare('SELECT percent_off FROM coupons WHERE code=? AND active=1').get(input.coupon.toUpperCase());
 if(!coupon)throw Object.assign(new Error('Cupom inválido'),{status:400});
 discount=Math.round(subtotal*coupon.percent_off/100);
 }
 const total=subtotal-discount+deliveryFee;
 const publicId=randomUUID();
 const order=db.prepare('INSERT INTO orders(public_id,customer_name,customer_phone,fulfillment,address,payment_method,subtotal_cents,total_cents,delivery_area_id,delivery_fee_cents,discount_cents) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(publicId,input.customer_name,input.customer_phone,input.fulfillment,input.fulfillment==='delivery'?input.address:null,input.payment_method,subtotal,total,areaId,deliveryFee,discount);
 const add=db.prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price_cents) VALUES(?,?,?,?,?)');
 const addExtra=db.prepare('INSERT INTO order_item_addons(order_item_id,addon_id,addon_name,price_cents) VALUES(?,?,?,?)');
 for(const l of lines){
 const item=add.run(order.lastInsertRowid,l.product.id,l.product.name,l.quantity,l.unit);
 for(const a of l.addons)addExtra.run(item.lastInsertRowid,a.id,a.name,a.price_cents);
 }
 return {order_id:publicId,status:'received',subtotal_cents:subtotal,discount_cents:discount,delivery_fee_cents:deliveryFee,total_cents:total};
 })();
 res.status(201).json(result);
}catch(e){next(e)}});
app.get('/api/orders/:publicId',(req,res,next)=>{try{
 const key=z.string().uuid().parse(req.params.publicId);
 const o=db.prepare('SELECT public_id,status,total_cents,created_at FROM orders WHERE public_id=?').get(key);
 if(!o)return res.status(404).json({error:'Pedido não encontrado'});
 res.json(o);
}catch(e){next(e)}});
app.use('/api/admin/manage',auth,management);
app.get('/api/admin/orders',auth,(_req,res)=>res.json({orders:db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 100').all()}));
app.get('/api/admin/audit',auth,(_req,res)=>res.json({events:db.prepare('SELECT id,admin_id,action,entity_type,entity_id,details,created_at FROM audit_logs ORDER BY id DESC LIMIT 100').all()}));
app.patch('/api/admin/orders/:id/status',auth,(req,res,next)=>{try{
 const {status}=z.object({status:z.enum(['received','confirmed','preparing','out_for_delivery','delivered','cancelled'])}).strict().parse(req.body);
 const id=routeId.parse(req.params.id);
 const result=db.transaction(()=>{
  const current=db.prepare('SELECT status,fulfillment FROM orders WHERE id=?').get(id);
  if(!current)return {missing:true};
  const allowed=transitions[current.status]||[];
  if(!allowed.includes(status)||(status==='out_for_delivery'&&current.fulfillment==='pickup'))return {invalid:true,current:current.status};
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status,id);
  logAudit.run(Number(req.user.sub),'order.status','order',String(id),JSON.stringify({from:current.status,to:status}));
  return {ok:true,status};
 })();
 if(result.missing)return res.status(404).json({error:'Pedido não encontrado'});
 if(result.invalid)return res.status(409).json({error:'Transição de status não permitida',current_status:result.current});
 res.json(result);
}catch(e){next(e)}});
app.patch('/api/admin/store',auth,(req,res,next)=>{try{
 const {accepting_orders}=z.object({accepting_orders:z.boolean()}).strict().parse(req.body);
 db.transaction(()=>{
 db.prepare('UPDATE store_settings SET accepting_orders=? WHERE id=1').run(Number(accepting_orders));
 logAudit.run(Number(req.user.sub),'store.accepting_orders','store','1',JSON.stringify({accepting_orders}));
 })();
 res.json({ok:true,accepting_orders});
}catch(e){next(e)}});
app.use((err,_req,res,_next)=>{
 if(err instanceof ZodError)return res.status(400).json({error:'Dados inválidos',details:err.issues});
 if(err?.status===400)return res.status(400).json({error:err.message});
 if(err?.code==='SQLITE_CONSTRAINT_CHECK')return res.status(400).json({error:'Valor fora dos limites permitidos'});
 if(err?.code==='SQLITE_CONSTRAINT_UNIQUE')return res.status(409).json({error:'Registro duplicado'});
 if(err?.code==='SQLITE_CONSTRAINT_FOREIGNKEY')return res.status(400).json({error:'Categoria inexistente'});
 console.error(err);res.status(500).json({error:'Erro interno'});
});
const port=Number(process.env.PORT||3001);
app.listen(port,()=>console.log('API IMPÉRIO BURGER ouvindo em '+port));
