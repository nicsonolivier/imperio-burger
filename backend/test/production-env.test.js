import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('produção rejeita ausência de credenciais ou CORS antes de ouvir porta',()=>{
 const dir=mkdtempSync(join(tmpdir(),'imperio-env-'));
 try{
  const base={...process.env,NODE_ENV:'production',JWT_SECRET:'test-secret-with-at-least-32-characters',DATABASE_PATH:join(dir,'db.sqlite'),PORT:'0'};
  for(const overrides of [
   {ADMIN_EMAIL:'',ADMIN_PASSWORD:'',CORS_ORIGIN:'http://localhost:8080'},
   {ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'strong-password-for-tests',CORS_ORIGIN:''},
   {ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'strong-password-for-tests',CORS_ORIGIN:'*'},
   {ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'strong-password-for-tests',CORS_ORIGIN:'http://loja.example.com'}
  ]){
   const result=spawnSync(process.execPath,['src/server.js'],{
    cwd:new URL('..',import.meta.url),env:{...base,...overrides},encoding:'utf8',timeout:10000
   });
   assert.notEqual(result.status,0,'Servidor não pode iniciar com configuração incompleta');
   assert.match(result.stderr,/Produção exige|CORS_ORIGIN deve conter/);
  }
 }finally{rmSync(dir,{recursive:true,force:true})}
});
