import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../config.js',import.meta.url),'utf8');
function apiFor(hostname,origin){
 const context={window:{location:{hostname,origin}}};
 const code=source.replace('export const API_BASE_URL=','globalThis.API_BASE_URL=');
 vm.runInNewContext(code,context);
 return context.API_BASE_URL;
}
test('API local usa porta 3001',()=>{
 assert.equal(apiFor('localhost','http://localhost:5500'),'http://localhost:3001/api');
 assert.equal(apiFor('127.0.0.1','http://127.0.0.1:5500'),'http://localhost:3001/api');
});
test('produção usa API HTTPS na mesma origem',()=>{
 assert.equal(apiFor('loja.exemplo.com','https://loja.exemplo.com'),'https://loja.exemplo.com/api');
});
