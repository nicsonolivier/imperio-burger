import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import Database from 'better-sqlite3';

test('backup inclui transações em WAL e permite restaurar os dados',()=>{
 const dir=mkdtempSync(join(tmpdir(),'imperio-backup-'));
 const source=join(dir,'source.sqlite');
 const backup=join(dir,'backup.sqlite');
 const restored=join(dir,'restored.sqlite');
 try{
  const db=new Database(source);
  db.pragma('journal_mode = WAL');
  db.exec('CREATE TABLE sample(id INTEGER PRIMARY KEY,value TEXT NOT NULL)');
  db.prepare('INSERT INTO sample(value) VALUES(?)').run('pedido de teste');
  const result=spawnSync(process.execPath,['scripts/backup.js',backup],{
   cwd:new URL('..',import.meta.url),
   env:{...process.env,DATABASE_PATH:source},
   encoding:'utf8'
  });
  assert.equal(result.status,0,result.stderr||result.stdout);
  const copy=new Database(backup,{readonly:true,fileMustExist:true});
  try{
   assert.equal(copy.pragma('integrity_check',{simple:true}),'ok');
   assert.equal(copy.prepare('SELECT value FROM sample WHERE id=1').get().value,'pedido de teste');
  }finally{copy.close()}
  db.close();
  // Simula recuperação em outro arquivo SQLite, sem tocar no banco original.
  const {copyFileSync}=await import('node:fs');
  copyFileSync(backup,restored);
  const recovered=new Database(restored,{readonly:true,fileMustExist:true});
  try{assert.equal(recovered.prepare('SELECT value FROM sample WHERE id=1').get().value,'pedido de teste')}
  finally{recovered.close()}
 }finally{rmSync(dir,{recursive:true,force:true})}
});
