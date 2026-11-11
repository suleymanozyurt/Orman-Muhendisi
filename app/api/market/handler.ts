import type {RawDB} from "../../../db/runtime.ts";import {clean,safeLink,validID} from "../resources/handler.ts";
const send=(b:unknown,s=200)=>Response.json(b,{status:s,headers:{"Cache-Control":"no-store"}});
const fields={description:2000,species:200,isbn:30,authors:300,publisher:200,nursery:200,region:150,size:100,age:100,origin:200,delivery:600,contact:200,url:1000};
const product=(r:Record<string,unknown>,user:string)=>{const {user_id,data,...v}=r;return {...v,data:JSON.parse(String(data)),owner:user_id===user};};
export async function handleMarket(request:Request,db?:RawDB){
 const user=request.headers.get("oai-authenticated-user-id");if(!user)return send({error:"Oturum açmalısın."},401);if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return send({error:"İstek geçersiz."},403);if(!db)return send({error:"Mağazaya ulaşılamadı. Yeniden dene."},503);
 try{
  if(request.method==="GET"){
   const p=new URL(request.url).searchParams,mode=p.get("mode")||"catalog";
   if(mode==="cart"){const rows=await db.prepare("SELECT o.*,c.quantity FROM market_cart c JOIN offerings o ON o.id=c.offering_id WHERE c.user_id=?").bind(user).all<Record<string,unknown>>();return send({items:rows.results.map(r=>product(r,user))});}
   if(mode==="orders"){const rows=await db.prepare("SELECT * FROM market_orders WHERE user_id=? OR seller_id=? ORDER BY created_at DESC LIMIT 200").bind(user,user).all<Record<string,unknown>>();return send({orders:rows.results.map(({user_id,seller_id,items,...r})=>({...r,items:JSON.parse(String(items)),seller:seller_id===user}))});}
   const kind=p.get("kind");if(kind&&!['book','seedling'].includes(kind))return send({error:"Kategori geçersiz."},400);const conditions=[p.get("mine")==="1"?"user_id=?":"(status='published' OR user_id=?)"],args:unknown[]=[user];if(kind){conditions.push("kind=?");args.push(kind);}const rows=await db.prepare(`SELECT * FROM offerings WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC LIMIT 200`).bind(...args).all<Record<string,unknown>>();return send({items:rows.results.map(r=>product(r,user)),limit:200});
  }
  const raw=await request.text();if(raw.length>10000)return send({error:"İstek çok uzun."},413);let b;try{b=JSON.parse(raw);}catch{return send({error:"İstek okunamadı."},400);}if(!b||typeof b!=="object")return send({error:"İstek geçersiz."},400);
  if(b.action==="save-product"){
   if(!validID(b.id)||!['book','seedling'].includes(b.kind)||!clean(b.title,200)||!clean(b.seller,200)||!['draft','published'].includes(b.status)||!Number.isInteger(b.priceCents)||b.priceCents<1||b.priceCents>100000000||!Number.isInteger(b.stock)||b.stock<0||b.stock>1000000||!b.data||typeof b.data!=="object")return send({error:"Ad, satıcı, fiyat ve stok bilgilerini kontrol et."},400);
   const data:Record<string,string>={};for(const [key,max] of Object.entries(fields))if(clean(b.data[key],max))data[key]=clean(b.data[key],max);if(data.url&&!safeLink(data.url))return send({error:"Satış bağlantısı HTTPS olmalı."},400);if(!data.delivery||!data.contact)return send({error:"Teslimat ve satıcı iletişim bilgisi gerekli."},400);
   if(b.kind==='seedling'&&(!data.species||!data.nursery||!data.region))return send({error:"Fidanın bilimsel adı, fidanlığı ve ili gerekli."},400);
   const old=await db.prepare("SELECT user_id,revision FROM offerings WHERE id=?").bind(b.id).first<{user_id:string;revision:number}>();if(old?.user_id&&old.user_id!==user)return send({error:"Bu ilanı düzenleyemezsin."},403);if(old&&old.revision!==b.revision)return send({error:"İlan değişti. Yeniden yükle."},409);const now=new Date().toISOString();
   if(old){const updated=await db.prepare("UPDATE offerings SET kind=?,title=?,data=?,seller=?,price_cents=?,stock=?,status=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=? RETURNING id").bind(b.kind,clean(b.title,200),JSON.stringify(data),clean(b.seller,200),b.priceCents,b.stock,b.status,now,b.id,user,b.revision).first();if(!updated)return send({error:"İlan değişti. Yeniden yükle."},409);}
   else {const count=await db.prepare("SELECT count(*) n FROM offerings WHERE user_id=?").bind(user).first<{n:number}>();if((count?.n||0)>=500)return send({error:"İlan sınırına ulaşıldı."},400);await db.prepare("INSERT INTO offerings (id,user_id,kind,title,data,seller,price_cents,stock,status,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,0,?,?)").bind(b.id,user,b.kind,clean(b.title,200),JSON.stringify(data),clean(b.seller,200),b.priceCents,b.stock,b.status,now,now).run();}return send({ok:true});
  }
  if(b.action==="cart"){
   if(!validID(b.id)||!Number.isInteger(b.quantity)||b.quantity<0||b.quantity>100)return send({error:"Adet geçersiz."},400);
   if(b.quantity===0){await db.prepare("DELETE FROM market_cart WHERE user_id=? AND offering_id=?").bind(user,b.id).run();return send({ok:true});}
   const o=await db.prepare("SELECT stock,status FROM offerings WHERE id=?").bind(b.id).first<{stock:number;status:string}>();if(!o||o.status!=="published")return send({error:"İlan satışta değil."},409);if(b.quantity>o.stock)return send({error:"Stoktan fazla adet seçildi."},409);const count=await db.prepare("SELECT count(*) n FROM market_cart WHERE user_id=?").bind(user).first<{n:number}>();if((count?.n||0)>=50){const existing=await db.prepare("SELECT quantity FROM market_cart WHERE user_id=? AND offering_id=?").bind(user,b.id).first();if(!existing)return send({error:"Sepette en fazla 50 farklı ürün bulunabilir."},400);}
   await db.prepare("INSERT INTO market_cart (user_id,offering_id,quantity) VALUES (?,?,?) ON CONFLICT(user_id,offering_id) DO UPDATE SET quantity=excluded.quantity").bind(user,b.id,b.quantity).run();return send({ok:true});
  }
  if(b.action==="request-order"){
   if(!validID(b.id)||!clean(b.buyerName,100)||!clean(b.contact,200))return send({error:"Ad ve iletişim bilgisi gerekli."},400);
   const existing=await db.prepare("SELECT user_id FROM market_orders WHERE id=?").bind(b.id).first<{user_id:string}>();if(existing)return existing.user_id===user?send({ok:true,id:b.id}):send({error:"Sipariş geçersiz."},409);
   const rows=await db.prepare("SELECT o.*,c.quantity FROM market_cart c JOIN offerings o ON o.id=c.offering_id WHERE c.user_id=?").bind(user).all<Record<string,unknown>>();if(!rows.results.length)return send({error:"Sepet boş."},400);
   const seller=rows.results[0].user_id;if(rows.results.some(r=>r.user_id!==seller))return send({error:"Her satıcı için ayrı sipariş oluştur. Diğer satıcının ürünlerini sepetten çıkar."},400);
   if(rows.results.some(r=>r.status!=="published"||Number(r.quantity)>Number(r.stock)))return send({error:"Sepetteki ilan veya stok değişti. Sepeti kontrol et."},409);
   const items=rows.results.map(r=>({id:r.id,title:r.title,kind:r.kind,quantity:r.quantity,price_cents:r.price_cents})),total=rows.results.reduce((n,r)=>n+Number(r.quantity)*Number(r.price_cents),0);if(!Number.isSafeInteger(total))return send({error:"Tutar geçersiz."},400);
   if(!Number.isSafeInteger(b.expectedTotal)||b.expectedTotal!==total)return send({error:"Sepetin fiyatı değişti. Yeniden kontrol edip talep oluştur."},409);
   // Requests do not reserve stock or charge money. Seller confirms availability separately.
   await db.batch([db.prepare("INSERT INTO market_orders (id,user_id,seller_id,status,items,total_cents,buyer_name,contact,note,revision,created_at) VALUES (?,?,?,'requested',?,?,?,?,?,0,?)").bind(b.id,user,seller,JSON.stringify(items),total,clean(b.buyerName,100),clean(b.contact,200),clean(b.note,1000),new Date().toISOString()),db.prepare("DELETE FROM market_cart WHERE user_id=?").bind(user)]);return send({ok:true,id:b.id});
  }
  if(b.action==="order-status"){
   if(!validID(b.id)||!Number.isInteger(b.revision)||!['confirmed','cancelled'].includes(b.status))return send({error:"İşlem geçersiz."},400);
   const o=await db.prepare("SELECT user_id,seller_id,status,revision FROM market_orders WHERE id=?").bind(b.id).first<{user_id:string;seller_id:string;status:string;revision:number}>();if(!o||o.user_id!==user&&o.seller_id!==user)return send({error:"Sipariş bulunamadı."},404);if(b.status==='confirmed'&&o.seller_id!==user)return send({error:"Yalnız satıcı onaylayabilir."},403);if(o.revision!==b.revision||o.status!=="requested")return send({error:"Sipariş durumu değişti."},409);
   const updated=await db.prepare("UPDATE market_orders SET status=?,revision=revision+1 WHERE id=? AND revision=? AND status='requested' RETURNING id").bind(b.status,b.id,b.revision).first();return updated?send({ok:true}):send({error:"Sipariş durumu değişti."},409);
  }
  return send({error:"İşlem geçersiz."},400);
 }catch(e){console.error("market request failed",e);return send({error:"İşlem tamamlanamadı. Bilgilerini koruyup yeniden dene."},503);}
}
