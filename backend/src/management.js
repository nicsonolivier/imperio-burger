import {Router} from 'express';
import {z} from 'zod';
import {db} from './db.js';

export const management=Router();
const id=z.coerce.number().int().positive();
const configs={
 categories:{table:'categories',schema:z.object({name:z.string().trim().min(2).max(80),active:z.boolean()}).strict(),fields:['name','active']},
 products:{table:'products',schema:z.object({category_id:id,name:z.string().trim().min(2).max(120),description:z.string().trim().max(500),price_cents:z.number().int().min(0).max(1000000),active:z.boolean()}).strict(),fields:['category_id','name','description','price_cents','active']}
};
for(const [resource,{table,schema,fields}] of Object.entries(configs)){
 management.get('/'+resource,(_req,res)=>res.json({items:db.prepare('SELECT * FROM '+table+' ORDER BY id DESC').all()}));
 management.post('/'+resource,(req,res,next)=>{try{
  const values=schema.parse(req.body);
  const columns=fields.join(',');
  const args=fields.map(field=>field==='active'?Number(values[field]):values[field]);
  const result=db.prepare('INSERT INTO '+table+' ('+columns+') VALUES ('+fields.map(()=>'?').join(',')+')').run(...args);
  res.status(201).json({id:Number(result.lastInsertRowid)});
 }catch(e){next(e)}});
 management.put('/'+resource+'/:id',(req,res,next)=>{try{
  const values=schema.parse(req.body);
  const args=fields.map(field=>field==='active'?Number(values[field]):values[field]);
  const result=db.prepare('UPDATE '+table+' SET '+fields.map(field=>field+'=?').join(',')+' WHERE id=?').run(...args,id.parse(req.params.id));
  if(!result.changes)return res.status(404).json({error:'Registro não encontrado'});
  res.json({ok:true});
 }catch(e){next(e)}});
 management.patch('/'+resource+'/:id/active',(req,res,next)=>{try{
  const {active}=z.object({active:z.boolean()}).strict().parse(req.body);
  const result=db.prepare('UPDATE '+table+' SET active=? WHERE id=?').run(Number(active),id.parse(req.params.id));
  if(!result.changes)return res.status(404).json({error:'Registro não encontrado'});
  res.json({ok:true});
 }catch(e){next(e)}});
}
