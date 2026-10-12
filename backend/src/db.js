import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import bcrypt from 'bcryptjs';

const location=resolve(process.env.DATABASE_PATH||'./data/imperio.sqlite');
mkdirSync(dirname(location),{recursive:true});
export const db=new Database(location);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,category_id INTEGER NOT NULL REFERENCES categories(id),name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',price_cents INTEGER NOT NULL CHECK(price_cents>=0),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,public_id TEXT NOT NULL UNIQUE,customer_name TEXT NOT NULL,customer_phone TEXT NOT NULL,fulfillment TEXT NOT NULL CHECK(fulfillment IN ('delivery','pickup')),address TEXT,payment_method TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'received',subtotal_cents INTEGER NOT NULL,total_cents INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(id INTEGER PRIMARY KEY,order_id INTEGER NOT NULL REFERENCES orders(id),product_id INTEGER NOT NULL REFERENCES products(id),product_name TEXT NOT NULL,quantity INTEGER NOT NULL CHECK(quantity>0),unit_price_cents INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS addons(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,price_cents INTEGER NOT NULL CHECK(price_cents>=0),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS coupons(id INTEGER PRIMARY KEY,code TEXT NOT NULL UNIQUE,percent_off INTEGER NOT NULL CHECK(percent_off BETWEEN 1 AND 100),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS delivery_areas(id INTEGER PRIMARY KEY,name TEXT NOT NULL UNIQUE,fee_cents INTEGER NOT NULL CHECK(fee_cents>=0),active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS order_item_addons(id INTEGER PRIMARY KEY,order_item_id INTEGER NOT NULL REFERENCES order_items(id),addon_id INTEGER NOT NULL REFERENCES addons(id),addon_name TEXT NOT NULL,price_cents INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS store_settings(id INTEGER PRIMARY KEY CHECK(id=1),accepting_orders INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO store_settings(id,accepting_orders) VALUES(1,0);
`);
const orderColumns=db.prepare('PRAGMA table_info(orders)').all().map(x=>x.name);
for(const [column,definition] of [['delivery_area_id','INTEGER REFERENCES delivery_areas(id)'],['delivery_fee_cents','INTEGER NOT NULL DEFAULT 0'],['discount_cents','INTEGER NOT NULL DEFAULT 0']]){
 if(!orderColumns.includes(column))db.exec('ALTER TABLE orders ADD COLUMN '+column+' '+definition);
}
if(db.prepare('SELECT COUNT(*) AS n FROM categories').get().n===0){
 const seed=db.transaction(()=>{
 const cat=db.prepare('INSERT INTO categories(name) VALUES(?)');
 cat.run('Hambúrgueres');cat.run('Combos');cat.run('Bebidas');
 const p=db.prepare('INSERT INTO products(category_id,name,description,price_cents) VALUES(?,?,?,?)');
 p.run(1,'Brasa Bacon','Burger artesanal com queijo e bacon',3890);
 p.run(1,'Costela Burger','Hambúrguer de costela na brasa',4290);
 p.run(2,'Combo Imperial','Hambúrguer, batata e bebida',5590);
 p.run(3,'Refrigerante','Lata 350 ml',790);
 });seed();
}
export function initAdmin(){
 const email=process.env.ADMIN_EMAIL?.toLowerCase().trim(),password=process.env.ADMIN_PASSWORD;
 if(!email&&!password)return;
 if(!email||!password||password.length<12)throw Error('Configure ADMIN_EMAIL e ADMIN_PASSWORD com 12+ caracteres');
 if(!db.prepare('SELECT id FROM admins WHERE email=?').get(email)){
 db.prepare('INSERT INTO admins(email,password_hash) VALUES(?,?)').run(email,bcrypt.hashSync(password,12));
 }
}
