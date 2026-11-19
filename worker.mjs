import { accountRoute, resolveAccount } from './auth.mjs';
import { applyHomeSeo, robotsTag, seoRoute } from './seo.mjs';
import { renderInfo } from './info.mjs';
import shareImage from './assets/social.png';

const seeds=[
 ['KhataKit','Fintech','A pocket ledger that reminds independent shopkeepers which invoices are overdue.'],
 ['Tiffin Club','Food & drink','Discover weekly lunch subscriptions from home cooks near your office.'],
 ['SprintPatra','Productivity','Turn a small team’s weekly updates into a single digest for busy founders.']
];
const questions=['Who would benefit most from this idea?','What would you need to know before trying it?'];
async function setup(db){
 await db.batch([
 'CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, owner TEXT, name TEXT, category TEXT, description TEXT, url TEXT, questions TEXT)',
 'CREATE TABLE IF NOT EXISTS reviews(product INTEGER, person TEXT, rating INTEGER, note TEXT, intent TEXT, answers TEXT, PRIMARY KEY(product,person))',
 'CREATE TABLE IF NOT EXISTS waits(product INTEGER,person TEXT,PRIMARY KEY(product,person))'
 ].map(q=>db.prepare(q)).concat(seeds.map((s,i)=>db.prepare('INSERT OR IGNORE INTO products VALUES(?,NULL,?,?,?,NULL,?)').bind(i+1,...s,JSON.stringify(questions)))))
}
export default {async fetch(req,env){
 const url=new URL(req.url);
 const path=url.pathname;
 const readable=req.method==='GET'||req.method==='HEAD';
 if(readable && path==='/social.png'){
   return new Response(req.method==='HEAD'?null:shareImage,{headers:{'Content-Type':'image/png','Cache-Control':'public, max-age=3600'}});
 }
 if(readable){
   const crawler=seoRoute(path,url.origin,env);
   if(crawler)return crawler;
   const page=path==='/' ? applyHomeSeo(PAGE,url.origin,env) : renderInfo(path,url.origin,env);
   if(page)return new Response(req.method==='HEAD'?null:page,{headers:{'Content-Type':'text/html;charset=utf-8','X-Robots-Tag':robotsTag(path,env),'X-Content-Type-Options':'nosniff'}});
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
   const [listings,reviews,waitlist]=await Promise.all([
     db.prepare('SELECT id,name,category,description,url,questions FROM products WHERE owner=? ORDER BY id').bind(user).all(),
     db.prepare('SELECT p.name product,r.product productId,r.note,r.rating,r.intent,r.answers,p.questions FROM reviews r JOIN products p ON p.id=r.product WHERE r.person=? ORDER BY p.id').bind(user).all(),
     db.prepare('SELECT p.id productId,p.name product FROM waits w JOIN products p ON p.id=w.product WHERE w.person=? ORDER BY p.id').bind(user).all()
   ]);
   return Response.json({
     listings:listings.results.map(p=>({...p,questions:JSON.parse(p.questions)})),
     reviews:reviews.results.map(r=>({...r,questions:JSON.parse(r.questions),answers:JSON.parse(r.answers)})),
     waitlist:waitlist.results
   },{headers:{'Content-Disposition':'attachment; filename="pitchadda-data.json"','Cache-Control':'private, no-store','X-Robots-Tag':'noindex'}});
 }
 const count=async()=>Number(await db.prepare('SELECT COUNT(*) FROM reviews WHERE person=?').bind(user||'').first('COUNT(*)'));
 if(req.method==='GET'){
 const {results}=await db.prepare(`SELECT p.*, (SELECT count(*) FROM reviews WHERE product=p.id) total,(SELECT round(avg(rating),1) FROM reviews WHERE product=p.id) avg,(SELECT count(*) FROM waits WHERE product=p.id) waits, EXISTS(SELECT 1 FROM reviews WHERE product=p.id AND person=?1) done, EXISTS(SELECT 1 FROM waits WHERE product=p.id AND person=?1) joined FROM products p ORDER BY owner IS NULL, CASE WHEN owner IS NULL THEN id ELSE -id END`).bind(user||'').all();
 const products=await Promise.all(results.map(async({owner,...p})=>({...p,questions:JSON.parse(p.questions),mine:!!user&&owner===user,seed:owner===null,feedback:user&&owner===user?(await db.prepare('SELECT note,rating,intent,answers FROM reviews WHERE product=? ORDER BY rowid DESC').bind(p.id).all()).results:[]})));
 return Response.json({products,count:await count(),signedIn:Boolean(user)},{headers:{'Cache-Control':'private, no-store'}})}
 if(req.method!=='POST')return fail('Unsupported method',405);
 if(!user)return fail('Sign in to participate.',401);
 if(req.headers.get('Origin')!==url.origin)return fail('Invalid origin',403);
 let b;try{b=await req.json()}catch{return fail('Invalid request')}
 const valid=(v,n=300)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
 if(b.action==='list'){
 if(await count()<3)return fail('Complete three reviews first.',403);
 if(!valid(b.name,80)||!valid(b.category,40)||![b.description,b.url,b.q1,b.q2].every(v=>valid(v))||(b.q3&&!valid(b.q3)))return fail('Complete each required field.');
 let link;try{link=new URL(b.url)}catch{return fail('Enter a valid website URL.')}if(!['https:','http:'].includes(link.protocol))return fail('Use an HTTP or HTTPS website.');
 await db.prepare('INSERT INTO products(owner,name,category,description,url,questions) VALUES(?,?,?,?,?,?)').bind(user,b.name,b.category,b.description,link.href,JSON.stringify([b.q1,b.q2,b.q3].filter(Boolean))).run()
 }else{
 const p=await db.prepare('SELECT owner,questions FROM products WHERE id=?').bind(Number(b.id)||0).first();
 if(!p||p.owner===user)return fail('Choose another founder’s product.');
 if(b.action==='join')await db.prepare('INSERT OR IGNORE INTO waits VALUES(?,?)').bind(b.id,user).run();
 else if(b.action==='review'){const answers=JSON.parse(p.questions).map((_,i)=>b['a'+i]);if(!answers.every(v=>valid(v))||!valid(b.note)||!['Would use','Would pay','Would pass'].includes(b.intent)||!['1','2','3','4','5'].includes(String(b.rating)))return fail('Complete the review.');
 await db.prepare('INSERT OR IGNORE INTO reviews VALUES(?,?,?,?,?,?)').bind(b.id,user,Number(b.rating),b.note,b.intent,JSON.stringify(answers)).run()
 }else return fail('Unknown action')}
 return Response.json({saved:true})
}};
