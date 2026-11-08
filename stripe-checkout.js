const {createHmac,timingSafeEqual}=require('node:crypto');
function verifyStripeSignature(raw,header,secret){
  if(!secret||!header)return false;
  const pairs=Object.fromEntries(header.split(',').map(part=>part.trim().split('=')));
  const ts=Number(pairs.t);
  if(!Number.isSafeInteger(ts)||Math.abs(Date.now()/1000-ts)>300)return false;
  const expected=createHmac('sha256',secret).update(ts+'.'+raw).digest('hex');
  return header.split(',').some(p=>{const [k,v]=p.trim().split('=');return k==='v1'&&/^[a-f0-9]{64}$/.test(v)&&timingSafeEqual(Buffer.from(v,'hex'),Buffer.from(expected,'hex'));});
}
async function createCheckout({secret,orderId,email,items,shippingMinor,currency='aed',origin}){
  if(!secret||!/^sk_(test|live)_/.test(secret))throw Error('Stripe secret key not configured');
  if(!/^https:\/\/[^/]+$/.test(origin))throw Error('Invalid checkout origin');
  const params=new URLSearchParams();
  params.set('mode','payment');params.set('customer_email',email);params.set('client_reference_id',orderId);
  params.set('success_url',origin+'/shop/checkout/success?session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url',origin+'/shop/checkout?cancelled=1');
  params.set('metadata[suqaena_order_id]',orderId);
  items.forEach(({name,quantity,unitMinor},i)=>{
    const p='line_items['+i+']';params.set(p+'[price_data][currency]',currency);
    params.set(p+'[price_data][unit_amount]',String(unitMinor));
    params.set(p+'[price_data][product_data][name]',name.slice(0,200));
    params.set(p+'[quantity]',String(quantity));
  });
  if(shippingMinor>0){const i=items.length,p='line_items['+i+']';params.set(p+'[price_data][currency]',currency);params.set(p+'[price_data][unit_amount]',String(shippingMinor));params.set(p+'[price_data][product_data][name]','Delivery');params.set(p+'[quantity]','1');}
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':'suqaena-'+orderId},body:params,signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(!response.ok||!data.url||!/^https:\/\/checkout\.stripe\.com\//.test(data.url))throw Error('Stripe checkout session could not be created');
  return {id:data.id,url:data.url};
}
module.exports={verifyStripeSignature,createCheckout};
