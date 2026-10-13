// Confere se o backup criado dentro do contêiner contém o pedido do smoke test.
// O backup é exportado apenas ao runner de CI e excluído ao final.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import Database from 'better-sqlite3';

const file=process.argv[2];
const publicId=process.argv[3];
assert.ok(file&&publicId,'Uso: node verify-backup.mjs backup.sqlite order-id');
const db=new Database(file,{readonly:true,fileMustExist:true});
try{
 assert.equal(db.pragma('integrity_check',{simple:true}),'ok');
 const row=db.prepare('SELECT status FROM orders WHERE public_id=?').get(publicId);
 assert.ok(row,'Pedido não encontrado no backup');
 assert.equal(row.status,'delivered');
 console.log('Backup Docker verificado: pedido finalizado preservado.');
}finally{db.close()}
