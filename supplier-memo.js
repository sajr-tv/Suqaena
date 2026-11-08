// SUQAENA internal supplier memo: public listing extraction only.
// Prices and delivery estimates are observations, not verified quotations.
const decode = s => String(s || '').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const clean = s => decode(String(s || '').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).slice(0,500);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validate(link) {
  const u = new URL(link);
  if (u.protocol !== 'https:' || u.hostname !== 'www.alibaba.com' || u.port || u.username || u.password || !/^\/product-detail\/[^/]+_\d{8,20}\.html$/.test(u.pathname)) throw Error('Use a direct www.alibaba.com product-detail HTTPS link.');
  return 'https://www.alibaba.com' + u.pathname;
}
function extract(html, url) {
  const memo = {url, supplier:null, supplierSource:null, unitCost:null, currency:null, priceRange:null, minimumOrder:null, deliveryTime:null, deliveryDestination:null, product:null, observedAt:new Date().toISOString(), status:'partial', notes:[]};
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const nodes=[];
  function collect(x){if(!x||typeof x!=='object')return;if(Array.isArray(x)){x.forEach(collect);return;}nodes.push(x);if(x['@graph'])collect(x['@graph']);}
  for(const m of scripts){try{collect(JSON.parse(m[1]));}catch{}}
  const product=nodes.find(x=>String(x['@type']||'').includes('Product'));
  if(product){
    memo.product=clean(product.name);
    const offer=Array.isArray(product.offers)?product.offers[0]:product.offers;
    if(offer){const n=Number(offer.price ?? offer.lowPrice);if(Number.isFinite(n)&&n>0){memo.unitCost=n;memo.currency=offer.priceCurrency||null;}if(offer.lowPrice&&offer.highPrice)memo.priceRange=String(offer.lowPrice)+'–'+String(offer.highPrice);}
    const seller=offer?.seller || product.brand || product.manufacturer;
    if(seller){memo.supplier=clean(typeof seller==='string'?seller:seller.name);memo.supplierSource='Structured listing data';}
  }
  const title=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  memo.product ||= title?clean(title[1]):null;
  const text=clean(html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')).slice(0,20000);
  const moq=text.match(/(?:minimum order|MOQ)\s*[:：]?\s*(\d[\d,]*)\s*(?:pieces|pcs|sets|units)?/i);
  if(moq)memo.minimumOrder=moq[1];
  // Delivery estimates are destination/quantity dependent: never infer from generic page text.
  memo.notes.push('Delivery time requires destination, quantity and selected shipping method; no generic estimate is treated as a confirmed quote.');
  if(!memo.supplier)memo.notes.push('Supplier identity not available in accessible structured listing data.');
  if(!memo.unitCost)memo.notes.push('Exact unit cost not available in accessible structured listing data; sign-in, quantity or variant selection may be required.');
  if(memo.unitCost)memo.notes.push('Displayed unit price excludes shipping, duties and taxes unless expressly quoted by the supplier.');
  memo.status=memo.supplier&&memo.unitCost?'listing-data':'partial';
  return memo;
}
async function inspect(link) {
  const url=validate(link);
  const response=await fetch(url,{signal:AbortSignal.timeout(9000),redirect:'error',headers:{'Accept':'text/html','User-Agent':'SUQAENA-SupplierReview/1.0'}});
  if(!response.ok)throw Error('Alibaba listing unavailable (HTTP '+response.status+').');
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))throw Error('Alibaba did not return an HTML product listing.');
  const html=(await response.text()).slice(0,1500000);
  if(/captcha|robot check|verify you are human/i.test(html.slice(0,10000)))throw Error('Alibaba requires browser verification. No price or delivery estimate was extracted.');
  return extract(html,url);
}
function render(memo, error, url) {
  const field=(name,value)=>'<tr><th style="text-align:left;padding:10px;border-bottom:1px solid #eadbd9">'+esc(name)+'</th><td style="padding:10px;border-bottom:1px solid #eadbd9">'+esc(value??'Not available / unverified')+'</td></tr>';
  return '<section style="max-width:840px;margin:24px auto;padding:24px;background:#fff;border:1px solid #e8d7c6;border-radius:12px"><h1>Supplier Intelligence Memo</h1><p>Internal use only · Listing observations are not supplier-confirmed stock or quotations.</p><form method="post" action="/shop/admin/supplier-memo"><label>Alibaba product URL<input style="width:100%;padding:12px;margin:8px 0" name="supplier_url" type="url" required value="'+esc(url||'https://www.alibaba.com/product-detail/Leranath-Fashion-Yellow-Rayon-Embroidered-Indian_10000049892700.html')+'"></label><button type="submit">Extract supplier memo</button></form>'+ (error?'<p role="alert" style="color:#9a1938">'+esc(error)+'</p>':'')+(memo?'<h2>Extraction result</h2><table style="width:100%;border-collapse:collapse">'+field('Product',memo.product)+field('Supplier',memo.supplier)+field('Supplier evidence',memo.supplierSource)+field('Unit cost (listing only)',memo.unitCost===null?null:memo.unitCost+' '+(memo.currency||'currency unspecified'))+field('Price range',memo.priceRange)+field('Minimum order',memo.minimumOrder)+field('Delivery time to GCC',memo.deliveryTime)+field('Source',memo.url)+field('Checked at',memo.observedAt)+field('Evidence status',memo.status)+'</table><h3>Verification notes</h3><p>'+memo.notes.map(esc).join(' ')+'</p>':'')+'<p><a href="/shop/admin">Back to admin</a></p></section>';
}
module.exports={inspect,render,validate};
