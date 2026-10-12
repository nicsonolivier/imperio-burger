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
const asId=z.coerce.number().int().positive();
app.get('/api/health',(_req,res)=>res.json({status:'ok'}));
app.get('/api/catalog',(_req,res)=>res.json({
 categories:db.prepare('SELECT id,name FROM categories WHERE active=1').all(),
 products:db.prepare('SELECT id,category_id,name,description,price_cents FROM products WHERE active=1').all()
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
 items:z.array(z.object({product_id:asId,quantity:z.number().int().min(1).max(30)})).min(1).max(30)
}).strict();
app.post('/api/orders',rateLimit({windowMs:15*60*1000,limit:15}),(req,res,next)=>{try{
 const input=orderSchema.parse(req.body);
 if(!db.prepare('SELECT accepting_orders FROM store_settings WHERE id=1').get()?.accepting_orders)return res.status(503).json({error:'Loja fechada'});
 if(input.fulfillment==='delivery'&&(!input.address||input.address.length<8))return res.status(400).json({error:'Informe endereço válido'});
 const result=db.transaction(()=>{
 let subtotal=0;
 const lines=input.items.map(line=>{
 const p=db.prepare('SELECT id,name,price_cents FROM products WHERE id=? AND active=1').get(line.product_id);
 if(!p)throw Object.assign(new Error('Produto indisponível'),{status:400});
 subtotal+=p.price_cents*line.quantity;
 return {...line,product:p};
 });
 if(subtotal>10000000)throw Object.assign(new Error('Pedido acima do limite'),{status:400});
 const publicId=randomUUID();
 const order=db.prepare('INSERT INTO orders(public_id,customer_name,customer_phone,fulfillment,address,payment_method,subtotal_cents,total_cents) VALUES(?,?,?,?,?,?,?,?)').run(publicId,input.customer_name,input.customer_phone,input.fulfillment,input.fulfillment==='delivery'?input.address:null,input.payment_method,subtotal,subtotal);
 const add=db.prepare('INSERT INTO order_items(order_id,product_id,product_name,quantity,unit_price_cents) VALUES(?,?,?,?,?)');
 for(const l of lines)add.run(order.lastInsertRowid,l.product.id,l.product.name,l.quantity,l.product.price_cents);
 return {order_id:publicId,status:'received',total_cents:subtotal};
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
app.patch('/api/admin/orders/:id/status',auth,(req,res,next)=>{try{
 const {status}=z.object({status:z.enum(['received','confirmed','preparing','out_for_delivery','delivered','cancelled'])}).parse(req.body);
 const n=db.prepare('UPDATE orders SET status=? WHERE id=?').run(status,asId.parse(req.params.id));
 if(!n.changes)return res.status(404).json({error:'Pedido não encontrado'});
 res.json({ok:true});
}catch(e){next(e)}});
app.patch('/api/admin/store',auth,(req,res,next)=>{try{
 const {accepting_orders}=z.object({accepting_orders:z.boolean()}).strict().parse(req.body);
 db.prepare('UPDATE store_settings SET accepting_orders=? WHERE id=1').run(Number(accepting_orders));
 res.json({ok:true,accepting_orders});
}catch(e){next(e)}});
app.use((err,_req,res,_next)=>{
 if(err instanceof ZodError)return res.status(400).json({error:'Dados inválidos',details:err.issues});
 if(err?.status===400)return res.status(400).json({error:err.message});
 if(err?.code==='SQLITE_CONSTRAINT_UNIQUE')return res.status(409).json({error:'Registro duplicado'});
 if(err?.code==='SQLITE_CONSTRAINT_FOREIGNKEY')return res.status(400).json({error:'Categoria inexistente'});
 console.error(err);res.status(500).json({error:'Erro interno'});
});
const port=Number(process.env.PORT||3001);
app.listen(port,()=>console.log('API IMPÉRIO BURGER ouvindo em '+port));
