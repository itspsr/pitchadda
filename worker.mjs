import { accountRoute, resolveAccount } from './auth.mjs';
import { applyHomeSeo, robotsTag, seoRoute } from './seo.mjs';
import { renderInfo } from './info.mjs';
import { renderProductPage } from './product-page.mjs';
import shareImage from './assets/social.png';

const seeds=[
 ['KhataKit','Fintech','A pocket ledger that reminds independent shopkeepers which invoices are overdue.'],
 ['Tiffin Club','Food & drink','Discover weekly lunch subscriptions from home cooks near your office.'],
 ['SprintPatra','Productivity','Turn a small team’s weekly updates into a single digest for busy founders.']
];
const launchStages=new Set(['Early access','Launched']);
const questions=['Who would benefit most from this idea?','What would you need to know before trying it?'];
async function setup(db){
 await db.batch([
 'CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, owner TEXT, name TEXT, category TEXT, description TEXT, url TEXT, questions TEXT)',
 'CREATE TABLE IF NOT EXISTS reviews(product INTEGER, person TEXT, rating INTEGER, note TEXT, intent TEXT, answers TEXT, PRIMARY KEY(product,person))',
 'CREATE TABLE IF NOT EXISTS waits(product INTEGER,person TEXT,PRIMARY KEY(product,person))',
 'CREATE TABLE IF NOT EXISTS product_votes(product INTEGER NOT NULL, person TEXT NOT NULL, PRIMARY KEY(product,person))',
 "CREATE TABLE IF NOT EXISTS product_stages(product INTEGER PRIMARY KEY, stage TEXT NOT NULL CHECK(stage IN ('Early access','Launched')))"
 ].map(q=>db.prepare(q)).concat(seeds.map((s,i)=>db.prepare('INSERT OR IGNORE INTO products VALUES(?,NULL,?,?,?,NULL,?)').bind(i+1,...s,JSON.stringify(questions)))))
}
const productStats = `
 CASE WHEN p.owner IS NULL THEN 'Practice brief' ELSE coalesce(s.stage,'Launched') END stage,
 (SELECT count(*) FROM reviews WHERE product=p.id) total,
 (SELECT round(avg(rating),1) FROM reviews WHERE product=p.id) avg,
 (SELECT count(*) FROM waits WHERE product=p.id) waits,
 (SELECT count(*) FROM product_votes WHERE product=p.id) votes`;
const productTables = 'FROM products p LEFT JOIN product_stages s ON s.product=p.id';

function htmlResponse(html, req, env, path) {
  return new Response(req.method === 'HEAD' ? null : html, {headers:{
    'Content-Type':'text/html;charset=utf-8',
    'X-Robots-Tag':robotsTag(path,env),
    'X-Content-Type-Options':'nosniff'
  }});
}

export default {async fetch(req,env){
 const url=new URL(req.url);
 const path=url.pathname;
 const readable=req.method==='GET'||req.method==='HEAD';
 if(readable && path==='/social.png'){
   return new Response(req.method==='HEAD'?null:shareImage,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'}});
 }
 if(readable){
   let productIds;
   if(path==='/sitemap.xml' && env.PUBLIC_INDEXING==='true'){
     await setup(env.DB);
     const {results}=await env.DB.prepare('SELECT id FROM products ORDER BY id').all();
     productIds=results.map(row=>row.id);
   }
   const crawler=seoRoute(path,url.origin,env,productIds);
   if(crawler)return req.method==='HEAD'?new Response(null,{status:crawler.status,headers:crawler.headers}):crawler;
   const match=/^\/p\/([1-9]\d*)$/.exec(path);
   if(match && Number.isSafeInteger(Number(match[1]))){
     await setup(env.DB);
     const product=await env.DB.prepare(`
       SELECT p.id,p.name,p.description,p.category,p.url,p.questions,${productStats}
       ${productTables} WHERE p.id=?
     `).bind(Number(match[1])).first();
     if(product){
       product.questions=JSON.parse(product.questions);
       return htmlResponse(renderProductPage(product,url.origin,env),req,env,path);
     }
   }
   const page=path==='/' ? applyHomeSeo(PAGE,url.origin,env) : renderInfo(path,url.origin,env);
   if(page)return htmlResponse(page,req,env,path);
 }
 const accountPage=await accountRoute(req,env);
 if(accountPage)return accountPage;
 if(path!=='/api' && path!=='/account/export')return new Response('Page not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
 const db=env.DB;
 let account;
 try{account=await resolveAccount(req,env)}
 catch{return new Response('Sign-in service temporarily unavailable.',{status:503,headers:{'Cache-Control':'no-store'}})}
 const user=account?.id;
 const fail=(s,status=400)=>new Response(s,{status});
 await setup(db);
 if(path==='/account/export'){
   if(req.method!=='GET')return fail('Use GET to download your data.',405);
   if(!user)return fail('Sign in to download your data.',401);
   const [listings,reviews,waitlist,votes]=await Promise.all([
     db.prepare("SELECT p.id,p.name,p.category,p.description,p.url,p.questions,coalesce(s.stage,'Launched') stage FROM products p LEFT JOIN product_stages s ON s.product=p.id WHERE p.owner=? ORDER BY p.id").bind(user).all(),
     db.prepare('SELECT p.name product,r.product productId,r.note,r.rating,r.intent,r.answers,p.questions FROM reviews r JOIN products p ON p.id=r.product WHERE r.person=? ORDER BY p.id').bind(user).all(),
     db.prepare('SELECT p.id productId,p.name product FROM waits w JOIN products p ON p.id=w.product WHERE w.person=? ORDER BY p.id').bind(user).all(),
     db.prepare('SELECT p.id productId,p.name product FROM product_votes v JOIN products p ON p.id=v.product WHERE v.person=? ORDER BY p.id').bind(user).all()
   ]);
   return Response.json({
     listings:listings.results.map(p=>({...p,questions:JSON.parse(p.questions)})),
     reviews:reviews.results.map(r=>({...r,questions:JSON.parse(r.questions),answers:JSON.parse(r.answers)})),
     waitlist:waitlist.results,
     votes:votes.results
   },{headers:{'Content-Disposition':'attachment; filename="pitchadda-data.json"','Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
 }
 const count=async()=>Number(await db.prepare('SELECT COUNT(*) FROM reviews WHERE person=?').bind(user||'').first('COUNT(*)'));
 if(req.method==='GET'){
 const {results}=await db.prepare(`
   SELECT p.*, ${productStats},
     EXISTS(SELECT 1 FROM reviews WHERE product=p.id AND person=?1) done,
     EXISTS(SELECT 1 FROM waits WHERE product=p.id AND person=?1) joined,
     EXISTS(SELECT 1 FROM product_votes WHERE product=p.id AND person=?1) voted
   ${productTables}
   ORDER BY p.owner IS NULL, CASE WHEN p.owner IS NULL THEN p.id ELSE -p.id END
 `).bind(user||'').all();
 const products=await Promise.all(results.map(async({owner,...p})=>({...p,questions:JSON.parse(p.questions),mine:!!user&&owner===user,seed:owner===null,feedback:user&&owner===user?(await db.prepare('SELECT note,rating,intent,answers FROM reviews WHERE product=? ORDER BY rowid DESC').bind(p.id).all()).results:[]})));
 return Response.json({products,count:await count(),signedIn:Boolean(user)},{headers:{'Cache-Control':'private, no-store'}})}
 if(req.method!=='POST')return fail('Unsupported method',405);
 if(!user)return fail('Sign in to participate.',401);
 if(req.headers.get('Origin')!==url.origin)return fail('Invalid origin',403);
 let b;try{b=await req.json()}catch{return fail('Invalid request')}
 if(!b||typeof b!=='object'||Array.isArray(b))return fail('Invalid request');
 const valid=(v,n=300)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
 if(b.action==='list'){
 if(await count()<3)return fail('Complete three reviews first.',403);
 if(!valid(b.name,80)||!valid(b.category,40)||![b.description,b.url,b.q1,b.q2].every(v=>valid(v))||(b.q3&&!valid(b.q3)))return fail('Complete each required field.');
 let link;try{link=new URL(b.url)}catch{return fail('Enter a valid website URL.')}if(!['https:','http:'].includes(link.protocol))return fail('Use an HTTP or HTTPS website.');
 const stage=b.stage===undefined?'Launched':b.stage;
 if(!launchStages.has(stage))return fail('Choose a valid launch stage.');
 await db.batch([
   db.prepare('INSERT INTO products(owner,name,category,description,url,questions) VALUES(?,?,?,?,?,?)')
     .bind(user,b.name,b.category,b.description,link.href,JSON.stringify([b.q1,b.q2,b.q3].filter(Boolean))),
   db.prepare('INSERT INTO product_stages(product,stage) VALUES(last_insert_rowid(),?)').bind(stage)
 ]);
 }else{
 const id=Number(b.id);
 if(!['number','string'].includes(typeof b.id)||!Number.isSafeInteger(id)||id<=0)return fail('Choose a valid product.');
 const p=await db.prepare('SELECT owner,questions FROM products WHERE id=?').bind(id).first();
 if(b.action==='set-stage'){
   if(!p||p.owner!==user)return fail('Only the listing owner can update its launch stage.',403);
   if(!launchStages.has(b.stage))return fail('Choose a valid launch stage.');
   await db.prepare(`INSERT INTO product_stages(product,stage) VALUES(?,?)
     ON CONFLICT(product) DO UPDATE SET stage=excluded.stage`).bind(id,b.stage).run();
   return Response.json({saved:true});
 }
 if(!p||p.owner===user)return fail('Choose another founder’s product.');
 if(b.action==='join')await db.prepare('INSERT OR IGNORE INTO waits VALUES(?,?)').bind(id,user).run();
 else if(b.action==='vote'){
   if(typeof b.active!=='boolean')return fail('Choose whether to upvote this product.');
   const sql=b.active
     ? 'INSERT OR IGNORE INTO product_votes(product,person) VALUES(?,?)'
     : 'DELETE FROM product_votes WHERE product=? AND person=?';
   await db.prepare(sql).bind(id,user).run();
 }
 else if(b.action==='review'){const answers=JSON.parse(p.questions).map((_,i)=>b['a'+i]);if(!answers.every(v=>valid(v))||!valid(b.note)||!['Would use','Would pay','Would pass'].includes(b.intent)||!['1','2','3','4','5'].includes(String(b.rating)))return fail('Complete the review.');
 await db.prepare('INSERT OR IGNORE INTO reviews VALUES(?,?,?,?,?,?)').bind(id,user,Number(b.rating),b.note,b.intent,JSON.stringify(answers)).run()
 }else return fail('Unknown action')}
 return Response.json({saved:true})
}};
