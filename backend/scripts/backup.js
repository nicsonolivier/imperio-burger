// Backup consistente do SQLite em modo WAL; execute com a API funcionando.
// Nunca publique backups, pois contêm dados pessoais de pedidos.
import 'dotenv/config';
import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const source=resolve(process.env.DATABASE_PATH||'./data/imperio.sqlite');
const destination=process.argv[2];
if(!destination){
 console.error('Uso: node scripts/backup.js /caminho/seguro/backup.sqlite');
 process.exit(2);
}
const target=resolve(destination);
if(source===target)throw Error('Origem e destino não podem ser iguais');
mkdirSync(dirname(target),{recursive:true});
const db=new Database(source,{readonly:true,fileMustExist:true});
try{
 await db.backup(target);
 const check=new Database(target,{readonly:true,fileMustExist:true});
 try{
  const result=check.pragma('integrity_check',{simple:true});
  if(result!=='ok')throw Error('Falha na verificação de integridade do backup: '+result);
 }finally{check.close()}
 console.log('Backup criado e verificado em '+target);
}finally{db.close()}
