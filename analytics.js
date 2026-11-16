const {Pool}=require('pg');
const {randomUUID,createHash,timingSafeEqual}=require('node:crypto');
function analytics(env=process.env){
 const pool=env.DATABASE_URL?new Pool({connectionString:env.DATABASE_URL,connectionTimeoutMillis:5000,statement_timeout:10000}):null;
 let ready;
 function init(){return ready??=(pool?pool.query("CREATE TABLE IF NOT EXISTS suqaena_visits (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, visitor_hash text NOT NULL, page text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())").catch(e=>{ready=null;throw e}):Promise.resolve());}
 function track(req,res,page){
  if(!pool||req.method!=='GET'||/\.(?:js|css|png|jpg|jpeg|svg|ico|webp|gif|txt|xml)$/i.test(page))return;
  const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)sq_visitor=([a-f0-9-]{36})(?:;|$)/);
  const id=cookie?cookie[1]:randomUUID();
  if(!cookie)res.setHeader('Set-Cookie','sq_visitor='+id+'; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax');
  const hash=createHash('sha256').update(id).digest('hex');
  init().then(()=>pool.query('INSERT INTO suqaena_visits(visitor_hash,page) VALUES($1,$2)',[hash,page.slice(0,300)])).catch(e=>console.error('Analytics write failed:',e.code||e.message));
 }
 async function report(req,res){
  const key=env.SHOP_ADMIN_PASSWORD||'';
  const provided=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  const a=Buffer.from(provided),b=Buffer.from(key);
  if(key.length<20||a.length!==b.length||!timingSafeEqual(a,b)){res.writeHead(403).end('Forbidden');return;}
  if(!pool){res.writeHead(503).end('Database unavailable');return;}
  try{
   await init();
   const [total,today,daily,top]=await Promise.all([
    pool.query('SELECT count(*)::int AS pageviews,count(DISTINCT visitor_hash)::int AS visitors FROM suqaena_visits'),
    pool.query("SELECT count(*)::int AS pageviews,count(DISTINCT visitor_hash)::int AS visitors FROM suqaena_visits WHERE created_at >= (now() AT TIME ZONE 'Asia/Dubai')::date AT TIME ZONE 'Asia/Dubai'"),
    pool.query("SELECT to_char(created_at AT TIME ZONE 'Asia/Dubai','YYYY-MM-DD') AS day,count(*)::int AS pageviews,count(DISTINCT visitor_hash)::int AS visitors FROM suqaena_visits WHERE created_at >= now()-interval '30 days' GROUP BY 1 ORDER BY 1"),
    pool.query('SELECT page,count(*)::int AS views FROM suqaena_visits GROUP BY page ORDER BY views DESC LIMIT 15')
   ]);
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({since:'tracking activation',total:total.rows[0],today:today.rows[0],daily:daily.rows,topPages:top.rows}));
  }catch(e){console.error('Analytics report failed:',e.code||e.message);res.writeHead(503).end('Analytics unavailable');}
 }
 return {track,report};
}
module.exports={analytics};
