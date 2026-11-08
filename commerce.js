const stripeCheckout = require('./stripe-checkout');
const supplierMemo = require('./supplier-memo');
const { Pool } = require('pg');
const { parse } = require('csv-parse/sync');
const { randomBytes, randomUUID, createHash, createHmac, scrypt, timingSafeEqual } = require('node:crypto');

const derivePassword = require('node:util').promisify(scrypt);

const categories = [
  'Pakistani Designer-Inspired Clothing', 'Unstitched 2-Piece and 3-Piece Suits',
  'Ready-to-Wear', 'Luxury Pret', 'Formal and Party Wear', 'Embroidered Lawn and Chiffon',
  'Sarees', 'Abayas and Kaftans', 'Bridal and Festive Wear', 'Accessories'
];
const countryNames = { AE: 'United Arab Emirates', SA: 'Saudi Arabia', QA: 'Qatar',
  KW: 'Kuwait', BH: 'Bahrain', OM: 'Oman' };
const markets = { AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR' };
const schema = `
CREATE TABLE IF NOT EXISTS shop_products (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, supplier text NOT NULL,
  supplier_id text NOT NULL, data jsonb NOT NULL, published boolean NOT NULL DEFAULT false,
  UNIQUE (supplier, supplier_id)
);
CREATE TABLE IF NOT EXISTS shop_users (
  email text PRIMARY KEY, password text NOT NULL,
  first_name text, last_name text
);
CREATE TABLE IF NOT EXISTS shop_sessions (
  token text PRIMARY KEY, email text NOT NULL REFERENCES shop_users(email),
  expires timestamptz NOT NULL DEFAULT now() + interval '12 hours'
);
CREATE TABLE IF NOT EXISTS shop_saved_carts (email text PRIMARY KEY REFERENCES shop_users(email), items jsonb NOT NULL DEFAULT '{}'::jsonb, updated timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS shop_orders (
  id uuid PRIMARY KEY, email text NOT NULL REFERENCES shop_users(email),
  data jsonb NOT NULL, status text NOT NULL DEFAULT 'test', tracking text,
  created timestamptz NOT NULL DEFAULT now()
);`;
const digest = value => createHash('sha256').update(value).digest('hex');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (amount, currency = 'AED') => new Intl.NumberFormat('en', {
  style: 'currency', currency
}).format(amount);
const invalid = message => Object.assign(new Error(message), { status: 400 });

function supplierRows(csv, margin, imageHosts) {
  if (!Number.isFinite(margin) || margin < 0 || margin > 90) throw invalid('Margin must be 0–90%.');
  const products = new Map();
  let rows;
  try {
    rows = parse(csv, { bom: true, columns: true, skip_empty_lines: true, trim: true, max_record_size: 16000 });
  } catch {
    throw invalid('Invalid CSV structure.');
  }
  if (!rows.length || rows.length > 2000) throw invalid('Upload 1–2,000 variant rows.');
  for (const [index, row] of rows.entries()) {
    const fail = message => { throw invalid(`Row ${index + 2}. ${message}`); };
    const required = (key, max) => {
      if (!row[key] || row[key].length > max) fail(`Invalid ${key}.`);
      return row[key];
    };
    const https = (value, allowed) => {
      let url;
      try { url = new URL(value); } catch { fail('Invalid URL.'); }
      if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed(url.hostname)) {
        fail('URL must use an approved HTTPS host.');
      }
      return url.href;
    };
    const supplier = required('supplier', 120).toLowerCase();
    const supplierId = required('product_id', 120);
    const category = required('category', 100);
    if (!categories.includes(category)) fail('Unknown category.');
    const source = row.source_url ? https(row.source_url, h => h === 'alibaba.com' || h.endsWith('.alibaba.com')) : '';
    const images = row.images ? row.images.split('|').map(value => https(value.trim(), h => imageHosts.includes(h))) : [];
    if (images.length > 8 || (images.length && row.image_permission !== 'yes')) fail('Image permission is required.');
    const base = {
      title: required('title', 180), description: required('description', 4000),
      specifications: row.specifications || '', fabric: required('fabric', 120),
      category, source, images
    };
    const cost = Number(required('wholesale_aed', 14));
    const quantity = Number(required('quantity', 8));
    if (!Number.isFinite(cost) || cost <= 0 || cost > 100000 || !Number.isInteger(quantity) || quantity < 0) {
      fail('Invalid wholesale price or quantity.');
    }
    const retail = row.retail_aed ? Number(row.retail_aed) : Math.round(cost / (1 - margin / 100) * 100) / 100;
    if (!Number.isFinite(retail) || retail <= 0 || retail > 1000000) fail('Invalid retail price.');
    const variant = {
      sku: required('sku', 120), size: required('size', 60), color: required('color', 60),
      cost, quantity, price: retail
    };
    const key = JSON.stringify([supplier, supplierId]);
    if (!products.has(key)) products.set(key, { supplier, supplierId, data: { ...base, variants: [] } });
    const product = products.get(key);
    const { variants, ...previous } = product.data;
    if (JSON.stringify(previous) !== JSON.stringify(base)) fail('Product details must match across variants.');
    if (variants.some(v => v.sku === variant.sku || (v.size === variant.size && v.color === variant.color))) {
      fail('Duplicate variant.');
    }
    variants.push(variant);
  }
  return [...products.values()];
}

function commerce(env = process.env) {
  const pool = env.DATABASE_URL ? new Pool({
    connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000, statement_timeout: 10000
  }) : null;
  pool?.on('error', error => console.error('Shop database connection error', error.code || error.name));
  const imageHosts = (env.SUPPLIER_IMAGE_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  let ready;
  const query = (...args) => pool.query(...args);
  let shipping;
  try {
    shipping = JSON.parse(env.SHOP_SHIPPING_JSON || '{}') || {};
  } catch {
    console.error('SHOP_SHIPPING_JSON is invalid. Shipping quotes are disabled.');
    shipping = {};
  }
  const site = env.SHOP_ORIGIN || 'https://suqaena.com';
  const secure = new URL(site).protocol === 'https:';
  const admin = (env.SHOP_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminEnabled = admin && (env.SHOP_ADMIN_PASSWORD || '').length >= 20;
  const adminSignature = token => createHmac('sha256', env.SHOP_ADMIN_PASSWORD)
    .update(`suqaena-admin:${admin}:${token}`).digest('hex');
  let activeLogins = 0;

  const dressHeader = `<div class="dress-site-header"><div class="dress-brand-row"><a class="dress-brand" href="/" aria-label="SUQAENA home"><span class="dress-monogram">SQ</span><span>SUQAENA</span></a><div class="dress-header-actions"><a href="/shop" aria-label="Search dresses" title="Browse dresses">⌕ <small>Search</small></a><a href="/shop/account" aria-label="Sign in or view account" title="Account">♡ <small>Account</small></a><a href="/shop/cart" aria-label="Shopping cart" title="Cart">♧ <small>Cart</small></a></div></div><nav class="dress-top-nav" aria-label="Dress collections"><a href="/">Home</a><a href="/shop?category=Pakistani%20Designer-Inspired%20Clothing">Designers <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop">New Arrivals <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?category=Ready-to-Wear">Casual Wear <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?category=Formal%20and%20Party%20Wear">Formal Wear <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?category=Luxury%20Pret">Luxury Pret <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?category=Unstitched%202-Piece%20and%203-Piece%20Suits">Unstitched <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?search=nightwear">Nightwear <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?category=Bridal%20and%20Festive%20Wear">Bridal & Wedding <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop">Collections <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?category=Accessories">Accessories <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a><a href="/shop?search=sale">Sale <span class="dress-nav-chevron" aria-hidden="true">⌄</span></a></nav></div><div class="dress-service-bar"><span>✦ Delivery Across GCC</span><span>✦ Secure Checkout</span><span>✦ Delivery &amp; Returns Details at Checkout</span></div>`;
  function dressPage(res, title, body) {
    page(res, title, body, 200, true);
  }
  function page(res, title, body, status = 200, dressLayout = false) {
    res.writeHead(status, {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': `default-src 'self'; img-src 'self' https:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`
    });
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} | SUQAENA</title><link rel="stylesheet" href="/shop.css">${dressLayout ? dressHeader.replace('class="dress-header-actions"', 'class="dress-header-actions"').replace('♡ <small>Account</small>', res.shopInitial ? `<span class="shop-initial">${escape(res.shopInitial)}</span><small>${escape(res.shopFirstName || 'Account')}</small>` : '♡ <small>Account</small>') : `<header><a href="/">SUQAENA</a><nav><a href="/shop">Shop</a><a href="/shop/cart">Cart</a><a href="/shop/account">Account</a></nav></header>`}<main class="${dressLayout ? 'dress-main' : ''}">${dressLayout ? '' : `<h1>${escape(title)}</h1>`}${body}</main></html>`);
  }
  const redirect = (res, location) => res.writeHead(303, { Location: location, 'Cache-Control': 'no-store' }).end();
  const form = (path, body, label) => `<form method="post" action="${path}">${body}<button>${label}</button></form>`;
  const input = (name, label, type = 'text') => `<label>${label}<input name="${name}" type="${type}" required></label>`;
  const image = product => product.images[0] ? `<img loading="lazy" alt="${escape(product.title)}" src="${escape(product.images[0])}">` : '';
  const cookie = (res, name, value, age) => res.appendHeader('Set-Cookie',
    `${name}=${value}; Path=/shop; HttpOnly; SameSite=Lax; Max-Age=${age}${secure ? '; Secure' : ''}`);

  async function handle(req, res, url) {
    const path = url.pathname;
    if (path !== '/shop' && !path.startsWith('/shop/')) return false;
    if (!pool) { page(res, 'Shop opening soon', '<p>Explore our collections from the homepage.</p>', 503); return true; }
    try {
      ready ||= (async () => {
        await query(schema);
        await query('ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS first_name text');
        await query('ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS last_name text');
        const supplierRecord = {
          title: 'Leranath Yellow Embroidered Shalwar Suit – 3 Piece',
          description: 'Yellow three-piece suit; exact supplier garment specifications pending verification.',
          category: 'Ready-to-Wear',
          source: 'https://www.alibaba.com/product-detail/Leranath-Fashion-Yellow-Rayon-Embroidered-Indian_10000049892700.html',
          images: ['/suqaena-leranath-yellow-suit.png','/suqaena-leranath-yellow-suit-side.png','/suqaena-leranath-yellow-suit-detail.png'],
          retailPriceAED: 75,
          displayedSizes: ['S','M','L','XL'],
          wholesalePriceAED: null,
          supplierContact: null,
          supplierResearch: {
            checkedAt: '2026-11-08',
            exactProductPrice: null,
            exactProductPriceStatus: 'Alibaba product page inaccessible; not verified',
            possibleSupplierContacts: [
              {name:'Leranath Fashion', email:'leranath.fashion@gmail.com', phone:'+91 99137 92875', address:'V Plaza D-501, near Gajera School, Katargam, Surat, Gujarat 395004, India', website:'https://leranathfashionstore.com/', matchStatus:'Name match; exact Alibaba seller identity unverified'},
              {name:'Leranath Fashion House', email:'Leranath.Fashion.House@Gmail.Com', phone:'+91 9978253682 / +91 9687967999', address:'A-1136, Upper Floor, New Bombay Market, Umarwada Road, Surat, Gujarat, India', website:'https://www.leranathfashionhouse.in/contact', matchStatus:'Similar name, distinct business; do not assume same seller'}
            ],
            referencePricesOnly: [
              {item:'Leranath Fashion embroidered rayon kurti with pant and dupatta (different item)',inr:570,source:'https://www.leranathfashion.in/ladies-kurti.html'}
            ],
            sourceLinks:['https://leranathfashionstore.com/','https://www.leranathfashionhouse.in/contact','https://www.leranathfashion.in/ladies-kurti.html'],
            nextStep:'Contact seller through exact Alibaba listing to confirm legal seller, unit cost, 1-piece MOQ, size inventory, GCC dropship rates and complimentary jewellery availability'
          },
          supplierCompany: null,
          supplierStockBySize: null,
          supplierShippingTerms: null,
          supplierDispatchTime: null,
          jewelleryGift: 'Complimentary matching jewellery; supplier fulfilment unconfirmed',
          verificationStatus: 'unverified',
          importStatus: 'needs-supplier-data',
          fulfilmentStatus: 'not-ready',
          photoNote: 'Model photos include AI-generated views; compare garment with original supplier photos before publication.',
          variants: []
        };
        const maroonSuit = {
          title: 'Maroon Embroidered Shalwar Suit with Dupatta – 3 Piece',
          description: 'Traditional maroon embroidered shalwar suit with matching dupatta. Product measurements, fabric, garment authenticity and supplier availability require confirmation.',
          category: 'Ready-to-Wear',
          source: 'https://www.alibaba.com/product-detail/Women-s-Maroon-Embroidered-Traditional-Floor_10000046824214.html',
          images: ["/suqaena-maroon-embroidered-suit-main.png","/suqaena-maroon-embroidered-suit-side.png","/suqaena-maroon-embroidered-suit-detail.png"],
          retailPriceAED: 250,
          displayedSizes: ['M','L','XL'],
          wholesalePriceAED: null,
          supplierContact: null,
          supplierResearch: {checkedAt:'2026-11-08', supplierPriceStatus:'Not verified; AED 250 is the user-specified retail price', shippingOrigin:'India (city not confirmed)', shippingQuoteStatus:'Estimated planning rates only; not a courier quote', estimatedGccShippingAED: {AE:55,SA:70,OM:60,QA:65,KW:70,BH:65}, estimatedTransit:'Approximately 5–12 business days, subject to carrier and customs', codStatus:'Not confirmed with carrier', dutiesTaxes:'Not included; require destination-specific verification'},
          verificationStatus:'unverified',
          importStatus:'needs-supplier-data',
          fulfilmentStatus:'not-ready',
          photoNote:'AI-generated SUQAENA model images; confirm exact supplier garment before publishing.',
          variants: []
        };
        await query(`INSERT INTO shop_products(supplier,supplier_id,data,published)
          VALUES ('alibaba','10000046824214',$1::jsonb,false)
          ON CONFLICT(supplier,supplier_id) DO UPDATE SET data =
            shop_products.data || jsonb_build_object(
              'retailPriceAED',250,
              'images',$3::jsonb,
              'photoNote','AI-generated SUQAENA model images; verify exact supplier garment',
              'displayedSizes',jsonb_build_array('M','L','XL'),
              'supplierResearch',$2::jsonb
            )`,[JSON.stringify(maroonSuit),JSON.stringify(maroonSuit.supplierResearch),JSON.stringify(maroonSuit.images)]);
        await query(`INSERT INTO shop_products(supplier,supplier_id,data,published) VALUES ('alibaba','10000042294975',$1::jsonb,false) ON CONFLICT(supplier,supplier_id) DO UPDATE SET data=shop_products.data || jsonb_build_object('retailPriceAED',178,'images',$2::jsonb,'displayedSizes',jsonb_build_array('M','L','XL','XXL'))`,[JSON.stringify({title:'Lemon Yellow Embroidered Party Wear Suit – 3 Piece',description:'Lemon yellow embroidered party wear kameez, wide-leg trousers and matching dupatta. Supplier specifications and size measurements awaiting confirmation.',category:'Ready-to-Wear',source:'https://www.alibaba.com/product-detail/Party-Wear-Designer-Embroidery-And-Sequence_10000042294975.html',images:['/suqaena-lemon-yellow-party-suit-main.png','/suqaena-lemon-yellow-party-suit-side.png','/suqaena-lemon-yellow-party-suit-detail.png'],retailPriceAED:178,wholesalePriceAED:65.48,displayedSizes:['M','L','XL','XXL'],verificationStatus:'unverified',fulfilmentStatus:'not-ready',photoNote:'AI-generated SUQAENA model photographs; compare garment to supplier original.',variants:[]}),JSON.stringify(['/suqaena-lemon-yellow-party-suit-main.png','/suqaena-lemon-yellow-party-suit-side.png','/suqaena-lemon-yellow-party-suit-detail.png'])]);
        await query(`INSERT INTO shop_products(supplier,supplier_id,data,published)
          VALUES ('alibaba','10000049892700',$1::jsonb,false)
          ON CONFLICT (supplier,supplier_id) DO UPDATE SET data =
          shop_products.data || jsonb_strip_nulls(
            jsonb_build_object(
              'retailPriceAED',75,
              'displayedSizes',jsonb_build_array('S','M','L','XL'),
              'jewelleryGift','Complimentary matching jewellery; supplier fulfilment unconfirmed',
              'photoNote','AI-generated views require comparison with supplier garment'
            )
          )`, [JSON.stringify(supplierRecord)]);
      })().catch(error => { ready = undefined; throw error; });
      await ready;
      if (path === '/shop/stripe/webhook') {
        if (req.method !== 'POST' || !env.SUQAENA_STRIPE_WEBHOOK_SECRET) { res.writeHead(404).end(); return true; }
        const chunks=[];let bytes=0;
        for await (const chunk of req){bytes+=chunk.length;if(bytes>262144){res.writeHead(413).end();return true;}chunks.push(chunk);}
        const raw=Buffer.concat(chunks).toString('utf8');
        if(!stripeCheckout.verifyStripeSignature(raw,req.headers['stripe-signature'],env.SUQAENA_STRIPE_WEBHOOK_SECRET)){res.writeHead(400).end();return true;}
        const event=JSON.parse(raw);
        if(event.type==='checkout.session.completed' || event.type==='checkout.session.async_payment_succeeded'){
          const obj=event.data?.object;
          const orderId=obj?.metadata?.suqaena_order_id;
          if(/^[0-9a-f-]{36}$/.test(orderId||'') && obj.payment_status==='paid' && obj.currency==='aed'){
            await query("UPDATE shop_orders SET status='paid' WHERE id=$1 AND status='pending_card' AND data->>'stripeSessionId'=$2 AND ROUND((data->>'totalMinor')::numeric)=$3",[orderId,obj.id,Number(obj.amount_total)]);
          }
        }
        res.writeHead(200,{'Content-Type':'application/json'}).end('{"received":true}');
        return true;
      }
      const post = req.method === 'POST';
      if (!post && req.method !== 'GET') { res.writeHead(405).end(); return true; }
      const cookies = Object.fromEntries((req.headers.cookie || '').split(/; */).map(entry => entry.split('=')));
      const token = cookies.shop_session;
      const session = /^[a-f0-9]{64}$/.test(token || '') ? (await query(
        'SELECT s.email,u.first_name,u.last_name FROM shop_sessions s JOIN shop_users u ON u.email=s.email WHERE s.token=$1 AND s.expires>now()', [digest(token)]
      )).rows[0] : null;
      res.shopFirstName = session?.first_name || '';
      res.shopInitial = session ? ((session.first_name || session.email)[0] || '').toUpperCase() + (session.last_name ? session.last_name[0].toUpperCase() : '') : '';
      const signature = cookies.shop_admin || '';
      const isAdmin = adminEnabled && session?.email === admin && /^[a-f0-9]{64}$/.test(signature) &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(adminSignature(token)));
      if (path.startsWith('/shop/admin') && !isAdmin) { page(res, 'Access denied', '', 403); return true; }
      let fields = new URLSearchParams();
      if (post) {
        if (req.headers.origin !== site) { page(res, 'Access denied', '', 403); return true; }
        if (req.headers['content-type']?.split(';')[0] !== 'application/x-www-form-urlencoded') throw invalid('Invalid form.');
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 2 * 1024 * 1024) { res.writeHead(413).end(); return true; }
          chunks.push(chunk);
        }
        fields = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
      }
      const get = name => fields.get(name) || '';
      if (path === '/shop/admin/supplier-memo') {
        let memo = null, error = '';
        const supplierUrl = post ? get('supplier_url') : url.searchParams.get('url') || '';
        if (post) {
          try { memo = await supplierMemo.inspect(supplierUrl); }
          catch (e) { error = e.message || 'Could not inspect the listing.'; }
        }
        page(res, 'Supplier Intelligence Memo', supplierMemo.render(memo, error, supplierUrl));
        return true;
      }

      const cart = new Map();
      // Never inherit another account's browser cart: bind it to the authenticated session.
      const cartOwner = session && token ? digest(token) : '';
      const trustedCartCookie = Boolean(cartOwner && cookies.shop_cart_owner === cartOwner);
      for (const item of (trustedCartCookie ? (cookies.shop_cart || '').split(',') : [])) {
        const [key, qty] = item.split(':');
        if ((/^\d{1,9}\.[a-f0-9]{64}$/.test(key) || /^preview-(leranath-(S|M|L|XL)|maroon-(M|L|XL)|lemon-(M|L|XL|XXL))$/.test(key)) && /^([1-9]|10)$/.test(qty)) cart.set(key, Number(qty));
      }
      if (session && cookies.shop_pending_variant && !post) {
        const pending = cookies.shop_pending_variant;
        cookie(res, 'shop_pending_variant', '', 0);
        if (/^\d{1,9}\.[a-f0-9]{64}$/.test(pending)) {
          const id = Number(pending.split('.')[0]);
          const row = (await query('SELECT data FROM shop_products WHERE id=$1 AND published', [id])).rows[0];
          const variant = row?.data?.variants?.find(v => digest(v.sku) === pending.split('.')[1]);
          if (variant && Number(variant.quantity) > (cart.get(pending) || 0) && (cart.get(pending) || 0) < 10 && cart.size < 30) {
            cart.set(pending, (cart.get(pending) || 0) + 1);
            cookie(res, 'shop_cart_owner', cartOwner, 604800);
            cookie(res, 'shop_cart', [...cart].map(([key, n]) => `${key}:${n}`).join(','), 604800);
            await query('INSERT INTO shop_saved_carts(email,items) VALUES ($1,$2::jsonb) ON CONFLICT(email) DO UPDATE SET items=$2::jsonb,updated=now()', [session.email,JSON.stringify(Object.fromEntries(cart))]);
            redirect(res, '/shop/cart');
            return true;
          }
        }
      }
      if (session) {
        const saved = (await query('SELECT items FROM shop_saved_carts WHERE email=$1',[session.email])).rows[0]?.items || {};
        for (const [key, quantity] of Object.entries(saved)) {
          if ((/^\d{1,9}\.[a-f0-9]{64}$/.test(key) || /^preview-(leranath-(S|M|L|XL)|maroon-(M|L|XL)|lemon-(M|L|XL|XXL))$/.test(key)) && Number.isInteger(quantity) && quantity > 0 && quantity <= 10 && !cart.has(key) && cart.size < 30) cart.set(key,quantity);
        }
      }
      const maroonPreviewProduct = {title:'Maroon Embroidered Shalwar Suit with Dupatta – 3 Piece',source:'https://www.alibaba.com/product-detail/Women-s-Maroon-Embroidered-Traditional-Floor_10000046824214.html',images:['/suqaena-maroon-embroidered-suit-main.png'],preview:true};
      const lemonPreviewProduct = {title:'Lemon Yellow Embroidered Party Wear Suit – 3 Piece',images:['/suqaena-lemon-yellow-party-suit-main.png'],preview:true};
      const previewProduct = {title:'Leranath Yellow Embroidered Shalwar Suit – 3 Piece',source:'https://www.alibaba.com/product-detail/Leranath-Fashion-Yellow-Rayon-Embroidered-Indian_10000049892700.html',preview:true};
      const lines = async () => {
        const ids = [...cart.keys()].filter(key => /^\d{1,9}\./.test(key)).map(key => Number(key.split('.')[0]));
        const products = (await query('SELECT id,data FROM shop_products WHERE published AND id=ANY($1::integer[])', [ids])).rows;
        return [...cart].flatMap(([key, quantity]) => {
          if (/^preview-(leranath-(S|M|L|XL)|maroon-(M|L|XL)|lemon-(M|L|XL|XXL))$/.test(key)) { const isLemon=key.startsWith('preview-lemon-'),isMaroon=key.startsWith('preview-maroon-');return [{key,quantity,product:isLemon?lemonPreviewProduct:isMaroon?maroonPreviewProduct:previewProduct,variant:{size:key.split('-').at(-1),color:isMaroon?'Maroon':isLemon?'Lemon Yellow':'Yellow',price:isLemon?178:isMaroon?250:75,quantity:0,sku:key},preview:true}]; }
          const [id, variantKey] = key.split('.');
          const product = products.find(row => row.id === Number(id))?.data;
          const variant = product?.variants.find(v => digest(v.sku) === variantKey);
          return variant ? [{ key, quantity, product, variant }] : [];
        });
      };

      if (path === '/shop/me' && !post) {
        res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        res.end(JSON.stringify({signedIn:Boolean(session),initials:res.shopInitial || '',firstName:res.shopFirstName || '',cartCount:[...cart.values()].reduce((a,b)=>a+b,0)}));
        return true;
      }
      if (path === '/shop' && !post) {
        const category = url.searchParams.get('category') || '';
        const search = (url.searchParams.get('q') || '').slice(0, 120);
        const rows = (await query(`SELECT id,data FROM shop_products WHERE published
          AND ($1='' OR data->>'category'=$1)
          AND ($2='' OR strpos(lower(concat_ws(' ',data->>'title',data->>'fabric',data->>'description')),lower($2))>0)
          ORDER BY id DESC LIMIT 100`, [category, search])).rows;
        const collection = category === 'Ready-to-Wear';
        const cards = rows.map(({ id, data }) => {
          const minPrice = Math.min(...data.variants.map(v => Number(v.price)).filter(Number.isFinite));
          return `<article class="fashion-card"><a class="fashion-image" href="/shop/product/${id}">${image(data) || '<div class="fashion-placeholder">Image coming soon</div>'}</a><div class="fashion-details"><h2><a href="/shop/product/${id}">${escape(data.title)}</a></h2><p class="fashion-price">${money(minPrice)}</p><a class="fashion-cta" href="/shop/product/${id}">View Dress</a></div></article>`;
        }).join('');
        const hero = collection ? `<section class="fashion-hero"><span class="fashion-eyebrow">SUQAENA · THE SIGNATURE EDIT</span><h1>Ready to Wear</h1><p>3-Piece Shalwar Suits</p><span class="fashion-rule"></span><div class="fashion-subtitle">Beautifully curated kameez, trousers and dupatta sets</div></section>` : '';
        const empty = collection ? `<article class="fashion-card fashion-preview"><a class="fashion-image" href="/shop/dress/leranath-yellow"><img src="/suqaena-leranath-yellow-suit.png" alt="Yellow embroidered three-piece shalwar suit on SUQAENA model" loading="lazy"></a><div class="fashion-details"><h2><a href="/shop/dress/leranath-yellow">Leranath Yellow Embroidered Shalwar Suit – 3 Piece</a></h2><p class="fashion-price">AED 75.00</p><fieldset class="fashion-sizes"><legend>Select size</legend><label><input type="radio" name="preview-size" value="S"><span>S</span></label><label><input type="radio" name="preview-size" value="M"><span>M</span></label><label><input type="radio" name="preview-size" value="L"><span>L</span></label><label><input type="radio" name="preview-size" value="XL"><span>XL</span></label></fieldset><form class="fashion-preview-cart-form" method="post" action="/shop/cart/preview"><input type="hidden" name="size" value=""><input type="hidden" name="quantity" value="1"><input type="hidden" name="return_to" value="/shop?category=Ready-to-Wear"><button class="fashion-cart-disabled" type="submit">Add to Shopping Bag</button></form><p class="fashion-note">Three-piece set · Minimum order: 1</p><p class="fashion-note">Free delivery</p></div></article>` : '<p>No products found.</p>';
        const maroonCard = collection ? `<article class="fashion-card fashion-preview"><a class="fashion-image" href="/shop/dress/maroon-embroidered"><img src="/suqaena-maroon-embroidered-suit-main.png" alt="Maroon embroidered shalwar suit with matching dupatta" loading="lazy"></a><div class="fashion-details"><h2><a href="/shop/dress/maroon-embroidered">Maroon Embroidered Shalwar Suit with Dupatta – 3 Piece</a></h2><p class="fashion-price">AED 250.00</p><fieldset class="fashion-sizes"><legend>Select size</legend><label><input type="radio" name="preview-size" value="M"><span>M</span></label><label><input type="radio" name="preview-size" value="L"><span>L</span></label><label><input type="radio" name="preview-size" value="XL"><span>XL</span></label></fieldset><form class="fashion-preview-cart-form" method="post" action="/shop/cart/preview"><input type="hidden" name="product" value="maroon"><input type="hidden" name="size" value=""><input type="hidden" name="quantity" value="1"><input type="hidden" name="return_to" value="/shop?category=Ready-to-Wear"><button class="fashion-cart-disabled" type="submit">Add to Shopping Bag</button></form><p class="fashion-note">Three-piece set · Minimum order: 1</p><p class="fashion-note">Free delivery</p></div></article>` : '';
        const lemonCard = collection ? `<article class="fashion-card fashion-preview"><a class="fashion-image" href="/shop/dress/lemon-yellow-party"><img src="/suqaena-lemon-yellow-party-suit-main.png" alt="Lemon yellow embroidered party wear three-piece suit" loading="lazy"></a><div class="fashion-details"><h2><a href="/shop/dress/lemon-yellow-party">Lemon Yellow Embroidered Party Wear Suit – 3 Piece</a></h2><p class="fashion-price">AED 178.00</p><fieldset class="fashion-sizes"><legend>Select size</legend><label><input type="radio" name="preview-size" value="M"><span>M</span></label><label><input type="radio" name="preview-size" value="L"><span>L</span></label><label><input type="radio" name="preview-size" value="XL"><span>XL</span></label><label><input type="radio" name="preview-size" value="XXL"><span>XXL</span></label></fieldset><form class="fashion-preview-cart-form" method="post" action="/shop/cart/preview"><input type="hidden" name="product" value="lemon"><input type="hidden" name="size" value=""><input type="hidden" name="quantity" value="1"><input type="hidden" name="return_to" value="/shop?category=Ready-to-Wear"><button class="fashion-cart-disabled" type="submit">Add to Shopping Bag</button></form><p class="fashion-note">Three-piece set · Minimum order: 1</p><p class="fashion-note">Free delivery</p></div></article>` : '';
        page(res, collection ? 'Ready-to-Wear Collection' : category || 'Shop the collection',
          `${hero}<div class="fashion-heading"><span>THE COLLECTION</span><p>${rows.length} ${rows.length === 1 ? 'style' : 'styles'} available</p></div><section class="grid fashion-grid">${cards || empty}${maroonCard}${lemonCard}</section><script src="/shop-gallery.js" defer></script>`);

      } else if (path === '/shop/dress/leranath-yellow' && !post) {
        dressPage(res, 'Leranath Yellow Embroidered Shalwar Suit', `
          <nav class="dress-breadcrumb"><a href="/">Home</a> / <a href="/shop?category=Ready-to-Wear">Ready to Wear</a> / Leranath Yellow Suit</nav>
          <section class="dress-detail">
            <div class="dress-gallery"><div class="dress-thumbnails"><button class="dress-thumb is-active" type="button" data-photo="/suqaena-leranath-yellow-suit.png" data-alt="Front view of yellow shalwar suit" aria-label="View front of dress" aria-pressed="true"><img src="/suqaena-leranath-yellow-suit.png" alt="Front dress view"></button><button class="dress-thumb" type="button" data-photo="/suqaena-leranath-yellow-suit-side.png" data-alt="AI-generated side view of yellow shalwar suit" aria-label="View side of dress" aria-pressed="false"><img src="/suqaena-leranath-yellow-suit-side.png" alt="Side dress view"></button><button class="dress-thumb" type="button" data-photo="/suqaena-leranath-yellow-suit-detail.png" data-alt="AI-generated waist-up embroidery detail of yellow suit" aria-label="View embroidery detail" aria-pressed="false"><img src="/suqaena-leranath-yellow-suit-detail.png" alt="Embroidery close-up view"></button></div><div class="dress-photo" id="dress-photo"><img id="dress-main-image" src="/suqaena-leranath-yellow-suit.png" alt="Leranath yellow embroidered shalwar suit on SUQAENA model" loading="eager"><span class="dress-zoom-hint">Hover or tap to zoom</span></div></div>
            <div class="dress-info">
              <div class="dress-eyebrow">SUQAENA · READY TO WEAR</div>
              <h1>Leranath Yellow Embroidered Shalwar Suit (3-Piece)</h1>
              <p class="dress-price">AED 75.00</p>
              <p class="dress-includes">Includes: Kameez + Trousers + Dupatta</p><aside class="dress-gift-offer" aria-label="Jewellery launch gift"><span class="dress-gift-icon" aria-hidden="true">✦</span><div><strong>Complimentary Matching Jewellery with This Dress</strong><p>A beautiful jewellery gift selected to complement your yellow ensemble — included at no extra charge.</p></div></aside>
              <fieldset class="dress-sizes"><legend>Choose your size</legend>
                <label><input type="radio" name="size" form="dress-preview-form" required value="S"><span>S</span></label>
                <label><input type="radio" name="size" form="dress-preview-form" required value="M"><span>M</span></label>
                <label><input type="radio" name="size" form="dress-preview-form" required value="L"><span>L</span></label>
                <label><input type="radio" name="size" form="dress-preview-form" required value="XL"><span>XL</span></label>
              </fieldset>
              <div class="dress-qty"><label for="dress-quantity">Quantity</label><div><button type="button" id="dress-minus" aria-label="Decrease quantity">−</button><output id="dress-quantity" aria-live="polite">1</output><button type="button" id="dress-plus" aria-label="Increase quantity">+</button></div></div>
              <form id="dress-preview-form" action="/shop/cart/preview" method="post"><input type="hidden" name="quantity" id="dress-cart-quantity" value="1"><input type="hidden" name="return_to" value="${path}"><button class="dress-add" type="submit">Add to Shopping Bag</button></form>
              <p class="dress-status">Save this dress to your shopping bag. Checkout opens after supplier stock and measurements are verified.</p>
              <div class="dress-trust"><span>✦ SUQAENA curated collection</span><span>✦ GCC delivery options</span><span>✦ Delivery fees confirmed at checkout</span></div>
              <details><summary>Product Details</summary><p>Yellow embroidered three-piece shalwar suit with matching trousers and dupatta. Product specifications pending supplier verification.</p></details>
              <details><summary>Size Guide</summary><p>Sizes S, M, L and XL are planned. Exact garment measurements will be published after supplier confirmation.</p></details>
              <details><summary>Delivery & Returns</summary><p>Delivery costs, delivery estimates and applicable returns terms will be shown before an order is accepted.</p></details>
            </div>
          </section>
          <script src="/shop-gallery.js" defer></script>
        `);
      } else if (path === '/shop/dress/maroon-embroidered' && !post) {
        dressPage(res, 'Maroon Embroidered Shalwar Suit with Dupatta', `
          <nav class="dress-breadcrumb"><a href="/">Home</a> / <a href="/shop?category=Ready-to-Wear">Ready to Wear</a> / Maroon Embroidered Suit</nav>
          <section class="dress-detail">
            <div class="dress-gallery"><div class="dress-thumbnails"><button class="dress-thumb is-active" type="button" data-photo="/suqaena-maroon-embroidered-suit-main.png" data-alt="Front view of maroon shalwar suit" aria-label="View front of dress" aria-pressed="true"><img src="/suqaena-maroon-embroidered-suit-main.png" alt="Front dress view"></button><button class="dress-thumb" type="button" data-photo="/suqaena-maroon-embroidered-suit-side.png" data-alt="AI-generated side view of maroon shalwar suit" aria-label="View side of dress" aria-pressed="false"><img src="/suqaena-maroon-embroidered-suit-side.png" alt="Side dress view"></button><button class="dress-thumb" type="button" data-photo="/suqaena-maroon-embroidered-suit-detail.png" data-alt="AI-generated waist-up embroidery detail of maroon suit" aria-label="View embroidery detail" aria-pressed="false"><img src="/suqaena-maroon-embroidered-suit-detail.png" alt="Embroidery close-up view"></button></div><div class="dress-photo" id="dress-photo"><img id="dress-main-image" src="/suqaena-maroon-embroidered-suit-main.png" alt="Maroon embroidered shalwar suit on SUQAENA model" loading="eager"><span class="dress-zoom-hint">Hover or tap to zoom</span></div></div>
            <div class="dress-info">
              <div class="dress-eyebrow">SUQAENA · READY TO WEAR</div>
              <h1>Maroon Embroidered Shalwar Suit with Dupatta (3-Piece)</h1>
              <p class="dress-price">AED 250.00</p>
              <p class="dress-includes">Includes: Kameez + Trousers + Dupatta</p>
              <fieldset class="dress-sizes"><legend>Choose your size</legend>
                
                <label><input type="radio" name="size" form="dress-preview-form" required value="M"><span>M</span></label>
                <label><input type="radio" name="size" form="dress-preview-form" required value="L"><span>L</span></label>
                <label><input type="radio" name="size" form="dress-preview-form" required value="XL"><span>XL</span></label>
              </fieldset>
              <div class="dress-qty"><label for="dress-quantity">Quantity</label><div><button type="button" id="dress-minus" aria-label="Decrease quantity">−</button><output id="dress-quantity" aria-live="polite">1</output><button type="button" id="dress-plus" aria-label="Increase quantity">+</button></div></div>
              <form id="dress-preview-form" action="/shop/cart/preview" method="post"><input type="hidden" name="product" value="maroon"><input type="hidden" name="quantity" id="dress-cart-quantity" value="1"><input type="hidden" name="return_to" value="${path}"><button class="dress-add" type="submit">Add to Shopping Bag</button></form>
              <p class="dress-status">Save this dress to your shopping bag. Checkout opens after supplier stock and measurements are verified.</p>
              <div class="dress-trust"><span>✦ SUQAENA curated collection</span><span>✦ GCC delivery options</span><span>✦ Delivery fees confirmed at checkout</span></div>
              <details><summary>Product Details</summary><p>Yellow embroidered three-piece shalwar suit with matching trousers and dupatta. Product specifications pending supplier verification.</p></details>
              <details><summary>Size Guide</summary><p>Sizes M, L and XL are planned. Exact garment measurements will be published after supplier confirmation.</p></details>
              <details><summary>Delivery & Returns</summary><p>Delivery costs, delivery estimates and applicable returns terms will be shown before an order is accepted.</p></details>
            </div>
          </section>
          <script src="/shop-gallery.js" defer></script>
        `);
      } else if (/^\/shop\/product\/\d{1,9}$/.test(path) && !post) {
        const row = (await query('SELECT id,data FROM shop_products WHERE id=$1 AND published', [path.split('/').pop()])).rows[0];
        if (!row) { page(res, 'Product unavailable', '', 404); return true; }
        const { id, data } = row;
        const photos = (Array.isArray(data.images) ? data.images : []).filter(src => typeof src === 'string' && src.startsWith('/') && !src.includes('"')).slice(0,3);
        const variants = Array.isArray(data.variants) ? data.variants : [];
        const sizes = [...new Set(variants.map(v => String(v.size || '')).filter(Boolean))];
        const price = Math.min(...variants.map(v => Number(v.price)).filter(n => Number.isFinite(n) && n > 0));
        const main = photos[0] || '';
        const thumbs = photos.map((src,i)=>`<button class="dress-thumb ${i===0?'is-active':''}" type="button" data-photo="${escape(src)}" data-alt="${escape(data.title)} view ${i+1}" aria-label="View product image ${i+1}" aria-pressed="${i===0?'true':'false'}"><img src="${escape(src)}" alt="${escape(data.title)} view ${i+1}"></button>`).join('');
        const options = variants.map(v=>`<option value="${id}.${digest(v.sku)}" ${Number(v.quantity)>0?'':'disabled'}>${escape(v.size)} · ${escape(v.color)} · ${money(v.price)}${Number(v.quantity)>0?'':' · Unavailable'}</option>`).join('');
        dressPage(res, data.title, `
          <nav class="dress-breadcrumb"><a href="/">Home</a> / <a href="/shop?category=${encodeURIComponent(data.category||'Ready-to-Wear')}">${escape(data.category||'Ready-to-Wear')}</a> / ${escape(data.title)}</nav>
          <section class="dress-detail"><div class="dress-gallery"><div class="dress-thumbnails">${thumbs}</div><div class="dress-photo" id="dress-photo">${main?`<img id="dress-main-image" src="${escape(main)}" alt="${escape(data.title)}" loading="eager">`:'<div class="fashion-placeholder">Product photograph coming soon</div>'}<span class="dress-zoom-hint">Hover or tap to zoom</span></div></div>
          <div class="dress-info"><div class="dress-eyebrow">SUQAENA · ${escape(data.category||'READY TO WEAR')}</div><h1>${escape(data.title)}</h1><p class="dress-price">${Number.isFinite(price)?money(price):'Price on request'}</p><p class="dress-includes">${escape(data.includedItems||'Beautifully curated SUQAENA collection')}</p>
          <form method="post" action="/shop/cart" id="product-purchase-form"><label for="product-variant">Choose your size and colour</label><select id="product-variant" name="variant" required><option value="" selected disabled>Select size and colour</option>${options}</select><button type="submit" class="dress-add" ${variants.some(v=>Number(v.quantity)>0)?'':'disabled'}>Add to Shopping Bag</button></form>
          <p class="dress-status">Free delivery · ${escape(data.deliveryMessage||'Delivery availability confirmed at checkout')}</p>
          <div class="dress-trust"><span>✦ SUQAENA curated collection</span><span>✦ Free delivery</span><span>✦ Secure checkout</span></div>
          <details><summary>Product details</summary><p>${escape(data.description||'')}</p></details><details><summary>Fabric and care</summary><p>${escape(data.fabric||'Fabric details available on request')}</p></details></div></section>
          <script src="/shop-gallery.js" defer></script>
        `);

      } else if (path === '/shop/dress/lemon-yellow-party' && !post) {
        dressPage(res, 'Lemon Yellow Embroidered Party Wear Suit', `<nav class="dress-breadcrumb"><a href="/">Home</a> / <a href="/shop?category=Ready-to-Wear">Ready to Wear</a> / Lemon Yellow Party Suit</nav><section class="dress-detail"><div class="dress-gallery"><div class="dress-thumbnails"><button class="dress-thumb is-active" type="button" data-photo="/suqaena-lemon-yellow-party-suit-main.png" data-alt="main view of lemon yellow suit" aria-label="View main image" aria-pressed="true"><img src="/suqaena-lemon-yellow-party-suit-main.png" alt="main view"></button><button class="dress-thumb" type="button" data-photo="/suqaena-lemon-yellow-party-suit-side.png" data-alt="side view of lemon yellow suit" aria-label="View side image" aria-pressed="false"><img src="/suqaena-lemon-yellow-party-suit-side.png" alt="side view"></button><button class="dress-thumb" type="button" data-photo="/suqaena-lemon-yellow-party-suit-detail.png" data-alt="detail view of lemon yellow suit" aria-label="View detail image" aria-pressed="false"><img src="/suqaena-lemon-yellow-party-suit-detail.png" alt="detail view"></button></div><div class="dress-photo" id="dress-photo"><img id="dress-main-image" src="/suqaena-lemon-yellow-party-suit-main.png" alt="Lemon yellow embroidered suit on SUQAENA model" loading="eager"><span class="dress-zoom-hint">Hover or tap to zoom</span></div></div><div class="dress-info"><div class="dress-eyebrow">SUQAENA · READY TO WEAR</div><h1>Lemon Yellow Embroidered Party Wear Suit (3-Piece)</h1><p class="dress-price">AED 178.00</p><p class="dress-includes">Includes: Kameez + Trousers + Dupatta</p><fieldset class="dress-sizes"><legend>Choose your size</legend><label><input type="radio" name="size" form="dress-preview-form" required value="M"><span>M</span></label><label><input type="radio" name="size" form="dress-preview-form" required value="L"><span>L</span></label><label><input type="radio" name="size" form="dress-preview-form" required value="XL"><span>XL</span></label><label><input type="radio" name="size" form="dress-preview-form" required value="XXL"><span>XXL</span></label></fieldset><div class="dress-qty"><label for="dress-quantity">Quantity</label><div><button type="button" id="dress-minus" aria-label="Decrease quantity">−</button><output id="dress-quantity" aria-live="polite">1</output><button type="button" id="dress-plus" aria-label="Increase quantity">+</button></div></div><form id="dress-preview-form" action="/shop/cart/preview" method="post"><input type="hidden" name="product" value="lemon"><input type="hidden" name="quantity" id="dress-cart-quantity" value="1"><input type="hidden" name="return_to" value="/shop/dress/lemon-yellow-party"><button class="dress-add" type="submit">Add to Shopping Bag</button></form><p class="dress-status">Save this dress to your shopping bag. Checkout opens after supplier stock and measurements are verified.</p><div class="dress-trust"><span>✦ SUQAENA curated collection</span><span>✦ Free delivery across GCC</span><span>✦ Secure checkout</span></div><details><summary>Product details</summary><p>Embroidered lemon yellow party wear three-piece suit with matching dupatta. Exact fabric and measurements are awaiting supplier confirmation.</p></details></div></section><script src="/shop-gallery.js" defer></script>`);
      } else if (path === '/shop/cart/preview' && post) {
        const size = get('size');
        const quantity = Number(get('quantity'));
        if (!['S','M','L','XL','XXL'].includes(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw invalid('Choose a valid size and quantity.');
        if (!session) { redirect(res, '/shop/account?mode=register'); return true; }
        const productCode = get('product') === 'lemon' ? 'lemon' : (get('product') === 'maroon' ? 'maroon' : 'leranath');
        if ((productCode === 'maroon' && !['M','L','XL'].includes(size)) || (productCode === 'lemon' && !['M','L','XL','XXL'].includes(size))) throw invalid('Choose a valid size.');
        const returnTo = get('return_to');
        const safeReturnTo = ['/shop/dress/leranath-yellow','/shop/dress/maroon-embroidered','/shop/dress/lemon-yellow-party','/shop?category=Ready-to-Wear','/shop'].includes(returnTo) ? returnTo : (productCode === 'maroon' ? '/shop/dress/maroon-embroidered' : '/shop/dress/leranath-yellow');
        cookie(res,'shop_return_to',encodeURIComponent(safeReturnTo),604800);
        const key = 'preview-' + productCode + '-' + size;
        cart.set(key, Math.min(10, (cart.get(key) || 0) + quantity));
        if (cart.size > 30) throw invalid('Shopping bag limit reached.');
        cookie(res, 'shop_cart_owner', cartOwner, 604800);
            cookie(res, 'shop_cart', [...cart].map(([k,n]) => k+':'+n).join(','), 604800);
        await query('INSERT INTO shop_saved_carts(email,items) VALUES ($1,$2::jsonb) ON CONFLICT(email) DO UPDATE SET items=$2::jsonb,updated=now()', [session.email,JSON.stringify(Object.fromEntries(cart))]);
        redirect(res, '/shop/cart');
      } else if (path === '/shop/cart') {
        if (post) {
          const key = get('variant');
          if (!(/^\d{1,9}\.[a-f0-9]{64}$/.test(key) || /^preview-(leranath-(S|M|L|XL)|maroon-(M|L|XL)|lemon-(M|L|XL|XXL))$/.test(key))) throw invalid('Invalid variant.');
          if (get('remove')) cart.delete(key);
          else {
            if (!session) {
              cookie(res, 'shop_pending_variant', key, 600);
              redirect(res, '/shop/account?mode=register');
              return true;
            }
            const quantity = (cart.get(key) || 0) + 1;
            cart.set(key, quantity);
            const line = (await lines()).find(item => item.key === key);
            if (!line || quantity > line.variant.quantity || quantity > 10 || cart.size > 30) throw invalid('Quantity unavailable.');
          }
          cookie(res, 'shop_cart_owner', cartOwner, 604800);
            cookie(res, 'shop_cart', [...cart].map(([key, n]) => `${key}:${n}`).join(','), 604800);
          if (session) await query('INSERT INTO shop_saved_carts(email,items) VALUES ($1,$2::jsonb) ON CONFLICT(email) DO UPDATE SET items=$2::jsonb,updated=now()', [session.email,JSON.stringify(Object.fromEntries(cart))]);
          redirect(res, path);
        } else {
          const items = await lines();
          const subtotal = items.reduce((sum, item) => sum + item.quantity * item.variant.price, 0);
          dressPage(res, 'Shopping bag', '<section class="cart-shell"><p class="account-eyebrow">YOUR SELECTION</p><h1>Shopping Bag</h1>' +
            (items.length ? items.map(({ key, quantity, product, variant }) =>
              `<article class="cart-line"><img class="cart-product-thumb" src="${escape(product.images?.[0] || '/suqaena-leranath-yellow-suit.png')}" alt="${escape(product.title)}" loading="lazy"><div><h2>${escape(product.title)}</h2><p>Size: ${escape(variant.size)} · Colour: ${escape(variant.color)}</p><p>Quantity: ${quantity} · ${money(variant.price)} each</p></div><div><strong>${money(quantity * variant.price)}</strong>${form(path, `<input type="hidden" name="variant" value="${key}"><input type="hidden" name="remove" value="1">`, 'Remove')}</div></article>`
            ).join('') + `<div class="cart-summary"><h2>Order Summary</h2><p>Subtotal <strong>${money(subtotal)}</strong></p><small>Free delivery. Orders are only available after supplier stock and delivery arrangements are confirmed.</small><a class="cart-checkout" href="/shop/checkout">Continue to checkout</a><a class="cart-continue-shopping" href="${escape((()=>{try{const p=decodeURIComponent(cookies.shop_return_to||'');return ['/shop/dress/leranath-yellow','/shop/dress/maroon-embroidered','/shop?category=Ready-to-Wear','/shop'].includes(p)?p:'/shop?category=Ready-to-Wear'}catch{return '/shop?category=Ready-to-Wear'}})())}">Continue Shopping</a></div>` :
              '<div class="cart-empty"><h2>Your shopping bag is empty</h2><p>Discover something beautiful in our latest collection.</p><a class="cart-checkout" href="/shop">Explore collection</a></div>') + '</section>');
        }
      } else if (path === '/shop/auth/google' && !post) {
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) throw invalid('Google sign-in is not configured.');
        const nonce = randomBytes(24).toString('hex');
        cookie(res, 'shop_google_state', nonce, 600);
        const params = new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:env.GOOGLE_REDIRECT_URI,
          response_type:'code',scope:'openid email profile',state:nonce,prompt:'select_account'});
        redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + params);
        return true;
      } else if (path === '/shop/auth/google/callback' && !post) {
        const state = url.searchParams.get('state') || '';
        const expected = cookies.shop_google_state || '';
        cookie(res, 'shop_google_state', '', 0);
        if (!/^[a-f0-9]{48}$/.test(state) || state !== expected || !env.GOOGLE_CLIENT_ID ||
            !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI || !url.searchParams.get('code')) throw invalid('Google sign-in could not be verified.');
        const response = await fetch('https://oauth2.googleapis.com/token', {method:'POST',
          headers:{'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({code:url.searchParams.get('code'),client_id:env.GOOGLE_CLIENT_ID,
            client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:env.GOOGLE_REDIRECT_URI,grant_type:'authorization_code'}),
          signal:AbortSignal.timeout(10000)});
        if (!response.ok) throw invalid('Google authentication failed.');
        const tokens = await response.json();
        if (!tokens.id_token) throw invalid('Google did not provide a valid identity.');
        const verified = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(tokens.id_token),
          {signal:AbortSignal.timeout(10000)});
        if (!verified.ok) throw invalid('Unable to verify Google identity.');
        const profile = await verified.json();
        if (profile.aud !== env.GOOGLE_CLIENT_ID || profile.iss !== 'https://accounts.google.com' && profile.iss !== 'accounts.google.com' ||
            profile.email_verified !== 'true' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email || '')) throw invalid('Google identity is not verified.');
        const email = profile.email.toLowerCase();
        if (email === admin) throw invalid('Use the administrator password to sign in.');
        await query('INSERT INTO shop_users(email,password) VALUES ($1,$2) ON CONFLICT DO NOTHING',[email,'google:oauth']);
        const newToken = randomBytes(32).toString('hex');
        if (session) await query('DELETE FROM shop_sessions WHERE token=$1',[digest(token)]);
        await query('INSERT INTO shop_sessions(token,email) VALUES ($1,$2)',[digest(newToken),email]);
        cookie(res,'shop_session',newToken,43200);
        cookie(res,'shop_cart','',0);
        cookie(res,'shop_cart_owner','',0);
        redirect(res,cookies.shop_pending_variant ? '/shop/cart' : '/shop/account');
        return true;
      } else if (path === '/shop/account') {
        if (post) {
          if (get('action') === 'logout') {
            if (session) await query('DELETE FROM shop_sessions WHERE token=$1', [digest(token)]);
            cookie(res, 'shop_session', '', 0);
            cookie(res, 'shop_cart', '', 0);
            cookie(res, 'shop_cart_owner', '', 0);
            cookie(res, 'shop_return_to', '', 0);
            cookie(res, 'shop_admin', '', 0);
            redirect(res, path);
            return true;
          }
          const email = get('email').trim().toLowerCase();
          const password = get('password');
          if (get('action') === 'register') {
            const first = get('first_name').trim(), last = get('last_name').trim();
            if (!/^[\p{L}][\p{L} .'-]{0,59}$/u.test(first) || !/^[\p{L}][\p{L} .'-]{0,59}$/u.test(last))
              throw invalid('Please enter your first and last name.');
            if (password !== get('confirm_password')) throw invalid('Passwords do not match.');
            if (get('terms') !== 'yes') throw invalid('Please accept the Terms and Privacy Policy.');
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128) throw invalid('Use a valid email and a password of 12–128 characters.');
          if (activeLogins >= 4) { page(res, 'Try again shortly', '', 429); return true; }
          activeLogins++;
          try {
            const record = email === admin ? undefined :
              (await query('SELECT password FROM shop_users WHERE email=$1', [email])).rows[0]?.password;
            const [salt, hash] = (record || '').split(':');
            const registering = get('action') === 'register';
            const newSalt = registering ? randomBytes(16).toString('hex') : null;
            const actual = await derivePassword(password, newSalt || salt || 'invalid-account', 64);
            if (email === admin) {
              if (!adminEnabled || registering ||
                !timingSafeEqual(Buffer.from(digest(password)), Buffer.from(digest(env.SHOP_ADMIN_PASSWORD)))) throw invalid('Invalid credentials.');
              await query("INSERT INTO shop_users VALUES ($1,'') ON CONFLICT DO NOTHING", [email]);
            } else if (registering) {
              const result = await query('INSERT INTO shop_users(email,password,first_name,last_name) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
                [email, `${newSalt}:${actual.toString('hex')}`, get('first_name').trim(), get('last_name').trim()]);
              if (!result.rowCount) throw invalid('Unable to register. Try signing in.');
            } else if (!/^[a-f0-9]{128}$/.test(hash || '') || !timingSafeEqual(actual, Buffer.from(hash, 'hex'))) {
              throw invalid('Invalid credentials.');
            }
            const newToken = randomBytes(32).toString('hex');
            if (session) await query('DELETE FROM shop_sessions WHERE token=$1', [digest(token)]);
            await query('INSERT INTO shop_sessions(token,email) VALUES ($1,$2)', [digest(newToken), email]);
            cookie(res, 'shop_session', newToken, 43200);
            cookie(res, 'shop_cart', '', 0);
            cookie(res, 'shop_cart_owner', '', 0);
            cookie(res, 'shop_admin', email === admin ? adminSignature(newToken) : '', email === admin ? 43200 : 0);
          } finally {
            activeLogins--;
          }
          redirect(res, cookies.shop_pending_variant ? '/shop/cart' : path);
        } else if (session && url.searchParams.get('mode') !== 'register' && url.searchParams.get('mode') !== 'login') {
          const orders = (await query('SELECT id,status,tracking FROM shop_orders WHERE email=$1 ORDER BY created DESC LIMIT 100', [session.email])).rows;
          dressPage(res, 'My account', `<section class="account-shell account-luxury"><div class="account-panel account-dashboard"><div class="account-crest">SQ</div><p class="account-eyebrow">YOUR SUQAENA ACCOUNT</p><h1>Welcome to SUQAENA</h1><p class="account-subtitle">A beautiful place to manage your shopping journey.</p><p class="account-email">${escape(session.email)}</p><div class="account-dashboard-links"><a href="/">Explore Collection</a><a href="/shop/cart">My Shopping Bag</a>${isAdmin ? '<a href="/shop/admin">Supplier Dashboard</a>' : ''}</div><h2>My Orders</h2>${orders.length ? orders.map(order => `<div class="account-order"><strong>Order ${escape(order.id)}</strong><span>${escape(order.status)} ${escape(order.tracking || '')}</span></div>`).join('') : '<p class="account-empty">You have no orders yet. Your favourites are waiting to be discovered.</p>'}${form(path, '<input type="hidden" name="action" value="logout">', 'Sign Out')}</div></section>`);
        } else {
          const registering = url.searchParams.get('mode') === 'register';
          const names = registering ? '<div class="account-name-row"><label class="account-field">First Name<input name="first_name" type="text" name="first_name" autocomplete="given-name" maxlength="60" placeholder="First name" required></label><label class="account-field">Last Name<input name="last_name" type="text" name="last_name" autocomplete="family-name" maxlength="60" placeholder="Last name" required></label></div>' : '';
          const credentials = names + '<label class="account-field">Email Address<input name="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254" required></label>' +
            '<label class="account-field">Password<input name="password" type="password" autocomplete="' + (registering ? 'new-password' : 'current-password') + '" minlength="12" maxlength="128" placeholder="At least 12 characters" required></label>' +
            (registering ? '<label class="account-field">Confirm Password<input name="confirm_password" type="password" autocomplete="new-password" minlength="12" maxlength="128" placeholder="Repeat your password" required></label>' : '') +
            '<label class="account-password-toggle"><input type="checkbox" data-show-password> Show passwords</label>' +
            (registering ? '<label class="account-terms"><input type="checkbox" name="terms" value="yes" required> I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>.</label>' : '');
          const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
          const googleButton = googleEnabled ? '<a class="account-google" href="/shop/auth/google"><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.24 5.48-4.75 7.18l7.73 6C44.43 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.87 23.87 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.03 37.65 27.29 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.97 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</a>' :
            '<p class="account-google-pending">Google sign-in will be available once secure Google authentication is connected.</p>';
          const body = '<section class="account-shell account-luxury"><div class="account-panel"><div class="account-crest">SQ</div><p class="account-eyebrow">THE SUQAENA EXPERIENCE</p><h1>' +
            (registering ? 'Join Our World' : 'Welcome Back') + '</h1><p class="account-subtitle">' +
            (registering ? 'Create your account to enjoy a more personal shopping experience.' : 'Your curated collection awaits. Sign in to continue.') +
            '</p>' + googleButton + '<div class="account-divider"><span>or continue with email</span></div>' +
            form(path, credentials + (registering ? '<input type="hidden" name="action" value="register">' : ''),
            registering ? 'Create My Account' : 'Sign In') + '<p class="account-switch">' +
            (registering ? 'Already part of SUQAENA? <a href="/shop/account">Sign In</a>' :
              'New to SUQAENA? <a href="/shop/account?mode=register">Create an Account</a>') +
            '</p><p class="account-back"><a href="/shop">← Back to the collection</a></p>' +
            '<p class="account-privacy">Your information is protected and used only to manage your SUQAENA shopping experience.</p></div></section><script src="/account.js" defer></script>';
          dressPage(res, registering ? 'Create account' : 'Sign in', body);
        }
      } else if (path === '/shop/checkout') {
        if (!session) { redirect(res, '/shop/account'); return true; }
        const items = await lines();
        if (!items.length || items.length !== cart.size) throw invalid('Your shopping bag is empty or needs review.');
        const stockVerified = items.every(line => !line.preview && line.quantity <= line.variant.quantity);
        const selected = post ? get('country') : url.searchParams.get('country') || 'AE';
        const country = String(selected).toUpperCase();
        if (!/^[A-Z]{2}$/.test(country) || !new Intl.DisplayNames(['en'], {type:'region'}).of(country) || new Intl.DisplayNames(['en'], {type:'region'}).of(country) === country) throw invalid('Enter a valid two-letter delivery country code.');
        const gcc = Object.hasOwn(markets, country);
        const market = gcc ? shipping[country] : null;
        const configured = gcc && market && Number.isFinite(market.fee) && market.fee >= 0 &&
          Number.isFinite(market.rate) && market.rate > 0 && typeof market.eta === 'string' && market.eta.length > 0;
        const total = configured ? items.reduce((sum, line) => sum + line.quantity * line.variant.price, 0) * market.rate + market.fee : 0;
        if (post) {
          if (!gcc && stockVerified && env.SUQAENA_CARD_CHECKOUT_ENABLED === 'true' && env.SUQAENA_STRIPE_SECRET_KEY && env.SUQAENA_STRIPE_WEBHOOK_SECRET) {
            const allowedCountries = (env.SUQAENA_CARD_SHIPPING_AED_JSON || '{}');
            let rates;
            try { rates = JSON.parse(allowedCountries); } catch { throw invalid('Shipping configuration unavailable.'); }
            if (!Object.hasOwn(rates,country)) throw invalid('Delivery is not available for this destination.');
            const shippingAED = 0; // SUQAENA customer-facing free delivery policy
            const address = Object.fromEntries(['first_name','last_name','phone','street','city','region','postal_code'].map(k => [k,get(k).trim()]));
            if (['first_name','last_name','phone','street','city','region'].some(k => address[k].length < 2 || address[k].length > 150)) throw invalid('Complete your delivery details.');
            const orderId = randomUUID();
            const lineItems = items.map(({product,variant,quantity}) => ({name:product.title+' · '+variant.size+' · '+variant.color,quantity,unitMinor:Math.round(variant.price*100)}));
            const totalMinor = lineItems.reduce((n,x)=>n+x.quantity*x.unitMinor,0)+shippingAED*100;
            const orderData = {country,paymentMethod:'stripe',currency:'aed',totalMinor,address,items:items.map(({product,variant,quantity})=>({title:product.title,sku:variant.sku,size:variant.size,quantity,unitAED:variant.price}))};
            await query('INSERT INTO shop_orders(id,email,data,status) VALUES($1,$2,$3,$4)',[orderId,session.email,JSON.stringify(orderData),'initiating_card']);
            try {
              const checkout = await stripeCheckout.createCheckout({secret:env.SUQAENA_STRIPE_SECRET_KEY,orderId,email:session.email,items:lineItems,shippingMinor:shippingAED*100,currency:'aed',origin:site});
              await query("UPDATE shop_orders SET data=jsonb_set(data,'{stripeSessionId}',to_jsonb($2::text)),status='pending_card' WHERE id=$1",[orderId,checkout.id]);
              redirect(res,checkout.url);
            } catch(error) {
              await query("UPDATE shop_orders SET status='card_session_failed' WHERE id=$1 AND status='initiating_card'",[orderId]);
              throw error;
            }
            return true;
          }
          // No COD or card charge is permitted until courier, stock and payment verification is configured.
          // Existing admin-only test order flow remains isolated from real customer payments.
          if (!stockVerified || !gcc || !configured || !isAdmin || env.SHOP_TEST_CHECKOUT !== 'true') throw invalid('Checkout is pending stock, shipping and payment activation.');
          const id = get('request_id');
          if (!/^[a-f\\d]{8}(-[a-f\\d]{4}){3}-[a-f\\d]{12}$/.test(id)) throw invalid('Invalid checkout request.');
          await query('INSERT INTO shop_orders(id,email,data,status) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
            [id, session.email, { country, paymentMethod:'cod', currency: markets[country], total, items: items.map(({ product, variant, quantity }) =>
              ({ title: product.title, source: product.source, sku: variant.sku, quantity, priceAED: variant.price })) }, 'test']);
          cookie(res, 'shop_cart', '', 0);
          cookie(res, 'shop_cart_owner', '', 0);
          redirect(res, '/shop/account');
        } else {
          const method = gcc ? 'Cash on Delivery' : 'Credit / Debit Card via Stripe';
          const subtotal = items.reduce((sum, line) => sum + line.quantity * line.variant.price, 0);
          const destinations = {...countryNames, GB:'United Kingdom', US:'United States', CA:'Canada', AU:'Australia', PK:'Pakistan', IN:'India', DE:'Germany', FR:'France'};
          const destinationOptions = Object.entries(destinations).map(([code,name]) =>
            `<option value="${code}"${country === code ? ' selected' : ''}>${escape(name)}</option>`).join('');
          const itemCards = items.map(({product,variant,quantity}) => {
            const imageUrl = product.preview ? '/suqaena-leranath-yellow-suit.png' : (product.images?.[0] || '');
            return `<div class="checkout-item">${imageUrl ? `<img src="${escape(imageUrl)}" alt="${escape(product.title)}" loading="lazy">` : '<span class="checkout-item-placeholder">SQ</span>'}<div><strong>${escape(product.title)}</strong><small>Size ${escape(variant.size)} · ${escape(variant.color)} · Qty ${quantity}</small></div><b>${money(variant.price * quantity)}</b></div>`;
          }).join('');
          const previewNotice = !stockVerified ? 'Supplier stock verification is pending. You can review your delivery details, but orders cannot be submitted yet.' : !configured ? 'Delivery charges and fulfilment must be confirmed before ordering opens.' : 'Checkout will open after final payment and courier verification.';
          const checkoutHtml = `<section class="checkout-shell">
            <div class="checkout-heading"><p class="account-eyebrow">SUQAENA · THE SIGNATURE EDIT</p><h1>Secure Checkout</h1><p>Almost yours. Review your delivery details and beautiful selections.</p></div>
            <form id="checkout-country-form" action="/shop/checkout" method="get"></form><div class="checkout-grid">
              <div class="checkout-panel"><form method="post" action="/shop/checkout" id="suqaena-order-form"><input type="hidden" name="country" value="${escape(country)}">
                <div class="checkout-section-heading"><span>01</span><div><h2>Contact Information</h2><p>We'll use these details for your order updates.</p></div></div>
                <div class="checkout-fields"><label>First name<input type="text" name="first_name" autocomplete="given-name" placeholder="First name"></label><label>Last name<input type="text" name="last_name" autocomplete="family-name" placeholder="Last name"></label><label class="checkout-wide">Email address<input type="email" autocomplete="email" value="${escape(session.email)}" readonly></label><label class="checkout-wide">Mobile number<input type="tel" name="phone" autocomplete="tel" placeholder="+971 50 000 0000"></label></div>
                <div class="checkout-section-heading"><span>02</span><div><h2>Delivery Address</h2><p>Choose your destination to see the available payment method.</p></div></div>
                <div class="checkout-country"><label>Country / Region<select name="country" form="checkout-country-form">${destinationOptions}</select></label><button type="submit" form="checkout-country-form">Update country</button></div>
                <div class="checkout-fields"><label class="checkout-wide">Street address<input name="street" autocomplete="street-address" placeholder="Building, street and apartment"></label><label>City<input name="city" autocomplete="address-level2" placeholder="City"></label><label><span id="checkout-region-label">State / Emirate</span><input id="checkout-region" name="region" autocomplete="address-level1" placeholder="State or emirate"></label><label class="checkout-wide">Postal code (if applicable)<input name="postal_code" autocomplete="postal-code" placeholder="Postal code"></label><label class="checkout-wide">Delivery notes (optional)<textarea rows="3" placeholder="Landmark or special delivery instructions"></textarea></label></div>
                <div class="checkout-section-heading"><span>03</span><div><h2>Payment Method</h2><p>Selected automatically from your delivery destination.</p></div></div>
                <div class="checkout-payment"><span class="checkout-payment-icon">${gcc ? '✦' : '▣'}</span><div><strong>${method}</strong><small>${gcc ? 'Pay your courier when your order arrives.' : 'Secure online card payment will be handled by Stripe.'}</small></div><span class="checkout-selected">Selected</span></div>
                <p class="checkout-note">Payment collection is only available after supplier stock and delivery arrangements are verified.</p></form>
              </div>
              <aside class="checkout-summary"><p class="account-eyebrow">YOUR SELECTION</p><h2>Order Summary</h2>${itemCards}
                <div class="checkout-totals"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Shipping</span><strong>Free</strong></div><div class="checkout-grand"><span>Estimated total</span><strong>${money(subtotal)}</strong></div></div>
                <p class="checkout-warning">${escape(previewNotice)}</p>
                ${!gcc && stockVerified && env.SUQAENA_CARD_CHECKOUT_ENABLED === "true" && env.SUQAENA_STRIPE_SECRET_KEY && env.SUQAENA_STRIPE_WEBHOOK_SECRET && env.SUQAENA_CARD_SHIPPING_AED_JSON ? '<button type="submit" form="suqaena-order-form" class="checkout-place-order">Pay securely with Stripe</button>' : '<button type="button" class="checkout-place-order" disabled>Place Order · Coming Soon</button>'}
                <p class="checkout-security">♢ Secure shopping · Payment processed only through Stripe</p><a class="checkout-back" href="/shop/cart">← Return to Shopping Bag</a>
              </aside>
            </div>
          </section>`;
          dressPage(res, 'Secure Checkout', checkoutHtml + '<script src="/checkout-regions.js" defer></script>');
        }
      } else if (path === '/shop/admin') {
        if (post) {
          const action = get('action');
          if (action === 'import') {
            if (get('authorized') !== 'yes') throw invalid('Confirm supplier authorization first.');
            const products = supplierRows(get('csv'), Number(get('margin') || NaN), imageHosts);
            await query(`INSERT INTO shop_products(supplier,supplier_id,data)
              SELECT supplier, "supplierId", data FROM jsonb_to_recordset($1::jsonb)
              AS incoming(supplier text, "supplierId" text, data jsonb)
              ON CONFLICT(supplier,supplier_id) DO UPDATE SET data=EXCLUDED.data,published=false`, [JSON.stringify(products)]);
          } else if (action === 'add-link') {
            const raw = get('url').trim();
            let supplierUrl;
            try { supplierUrl = new URL(raw); } catch { throw invalid('Paste a valid Alibaba product URL.'); }
            if (supplierUrl.protocol !== 'https:' || !['alibaba.com','www.alibaba.com'].includes(supplierUrl.hostname) || supplierUrl.username || supplierUrl.password || supplierUrl.port) throw invalid('Only Alibaba.com HTTPS product links are accepted.');
            const match = supplierUrl.pathname.match(/^\/product-detail\/([^/]*?)_(\d{8,20})\.html$/);
            if (!match) throw invalid('Please paste a direct Alibaba product-detail link.');
            const supplierId = match[2];
            const title = match[1].replace(/[-_]+/g, ' ').trim().slice(0,180) || 'Alibaba product awaiting verification';
            const source = 'https://www.alibaba.com' + supplierUrl.pathname;
            const data = { title, description: 'Awaiting authorized supplier catalogue details and exact garment verification.', specifications: '', fabric: '', category: 'Ready-to-Wear', source, images: [], importStatus: 'needs-supplier-data', variants: [] };
            await query(`INSERT INTO shop_products(supplier,supplier_id,data,published)
              VALUES ('alibaba', $1, $2, false)
              ON CONFLICT(supplier,supplier_id) DO UPDATE SET
                data = CASE WHEN shop_products.published THEN shop_products.data ELSE EXCLUDED.data END`, [supplierId, JSON.stringify(data)]);
          } else if (action === 'edit-product') {
            const id = get('id');
            if (!/^\d{1,9}$/.test(id)) throw invalid('Invalid product.');
            const row = (await query('SELECT data FROM shop_products WHERE id=$1', [id])).rows[0];
            if (!row) throw invalid('Product not found.');
            const title = get('title').trim();
            const description = get('description').trim();
            const price = Number(get('price'));
            if (!title || title.length > 180 || description.length > 4000 || !Number.isFinite(price) || price <= 0 || price > 1000000) throw invalid('Invalid product details or price.');
            if (!row.data.variants?.length) throw invalid('Supplier sizes, stock and wholesale price must be verified before editing retail price. This link is saved as a draft.');
            const data = { ...row.data, title, description, variants: row.data.variants.map(v => ({...v, price})) };
            await query('UPDATE shop_products SET data=$2 WHERE id=$1', [id, JSON.stringify(data)]);
          } else if (['publish', 'unpublish', 'remove'].includes(action)) {
            const ids = fields.getAll('id').filter(id => /^\d{1,9}$/.test(id));
            if (action === 'publish' && get('verified') !== 'yes') throw invalid('Confirm review before publication.');
            if (action === 'publish' && ids.length) {
              const pending = (await query('SELECT id,data FROM shop_products WHERE id=ANY($1::integer[])', [ids])).rows;
              if (pending.some(row => !row.data.images?.length || !row.data.variants?.length || row.data.variants.some(v => !v.sku || !v.size || !Number.isFinite(v.price) || v.price <= 0 || !Number.isInteger(v.quantity) || v.quantity < 0))) throw invalid('Complete verified images, supplier sizes, stock and prices before publishing.');
            }
            if (action === 'remove') await query('DELETE FROM shop_products WHERE id=ANY($1::integer[])', [ids]);
            else await query('UPDATE shop_products SET published=$2 WHERE id=ANY($1::integer[])', [ids, action === 'publish']);
          } else if (['review-order', 'track-order'].includes(action)) {
            if (!/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/.test(get('order'))) throw invalid('Invalid order ID.');
            if (action === 'track-order') {
              const tracking = get('tracking').trim();
              if (!/^[a-zA-Z0-9 -]{1,100}$/.test(tracking)) throw invalid('Invalid tracking reference.');
              await query("UPDATE shop_orders SET tracking=$2 WHERE id=$1 AND status='test reviewed'", [get('order'), tracking]);
            } else await query("UPDATE shop_orders SET status='test reviewed' WHERE id=$1 AND status='test'", [get('order')]);
          } else throw invalid('Unknown action.');
          redirect(res, path);
        } else {
          const rows = (await query('SELECT * FROM shop_products ORDER BY id DESC LIMIT 200')).rows;
          const orders = (await query('SELECT * FROM shop_orders ORDER BY created DESC LIMIT 100')).rows;
          page(res, 'Supplier dashboard', `<h2>Add a dress from Alibaba</h2><p>Paste one Alibaba product link. SUQAENA saves a private draft and the supplier reference. Details, pricing, images and stock must be verified before the dress can go on sale.</p>${form(path, '<input type="hidden" name="action" value="add-link"><label>Alibaba product link<input name="url" type="url" placeholder="https://www.alibaba.com/product-detail/..." required></label>', 'Save product link as draft')}<details><summary>Advanced: Import supplier CSV</summary><h2>Import supplier CSV</h2><p>Paste authorized CSV or select a CSV file. Reimports replace all variants and return the product to draft.</p><p><code>supplier,product_id,sku,title,description,specifications,category,fabric,size,color,wholesale_aed,quantity,source_url,images,image_permission,retail_aed</code></p><label>CSV file<input id="csv-file" type="file" accept=".csv,text/csv"></label><script src="/supplier-import.js" defer></script>${form(path, '<input type="hidden" name="action" value="import"><label>Catalogue CSV<textarea id="csv" name="csv" required></textarea></label><label>Gross margin %<input type="number" name="margin" min="0" max="90" step="0.01" required></label><label><input type="checkbox" name="authorized" value="yes" required>Supplier authorized catalogue and image use</label>', 'Import drafts')}</details><h2>Edit product details</h2><p>Prices and descriptions can be updated without changing the image. Changes appear on the shop after saving.</p>${rows.map(row => `<details><summary>${escape(row.data.title)} — edit</summary><form method="post" action="/shop/admin"><input type="hidden" name="action" value="edit-product"><input type="hidden" name="id" value="${row.id}"><label>Product title<input name="title" maxlength="180" required value="${escape(row.data.title)}"></label><label>Description<textarea name="description" required>${escape(row.data.description)}</textarea></label><label>Retail price (AED)<input name="price" type="number" min="0.01" max="1000000" step="0.01" required value="${escape(row.data.variants[0]?.price || '')}"></label><button>Save changes</button></form></details>`).join('')}<h2>Products</h2><form method="post" action="${path}">${rows.map(row => `<article><label><input type="checkbox" name="id" value="${row.id}">${escape(row.data.title)} · ${row.published ? 'Published' : 'Draft'}</label>${image(row.data)}<p>${escape(row.supplier)} · ${escape(row.supplier_id)} · ${escape(row.data.category)}</p><p>${escape(row.data.description)} · ${escape(row.data.fabric)} · ${escape(row.data.specifications)}</p>${row.data.source ? `<a href="${escape(row.data.source)}" target="_blank" rel="noopener noreferrer">Supplier listing</a>` : ''}<p>Retail: ${escape(row.data.retailPriceAED ?? row.data.variants[0]?.price ?? 'Pending')} AED · Supplier cost: ${escape(row.data.wholesalePriceAED ?? 'UNVERIFIED')} · Contact: ${escape(row.data.supplierContact ?? 'UNVERIFIED')} · Stock: ${escape(row.data.supplierStockBySize ?? 'UNVERIFIED')} · Shipping: ${escape(row.data.supplierShippingTerms ?? 'UNVERIFIED')} · Fulfilment: ${escape(row.data.fulfilmentStatus ?? 'Pending verification')}</p><ul>${row.data.variants.map(v => `<li>${escape(v.sku)} · ${escape(v.size)} · ${escape(v.color)} · ${v.quantity} available · ${money(v.cost)} wholesale · ${money(v.price)} retail</li>`).join('')}</ul></article>`).join('')}<label><input type="checkbox" name="verified" value="yes">I verified the selected listings, availability and image permissions</label><button name="action" value="publish">Publish</button><button name="action" value="unpublish">Unpublish</button><button name="action" value="remove">Remove</button></form><h2>Test orders</h2>${orders.map(order => `<article><p>${order.id} · ${escape(order.status)} · ${escape(order.data.country)}</p><ul>${order.data.items.map(item => `<li>${escape(item.title)} · ${escape(item.sku)} × ${item.quantity}</li>`).join('')}</ul>${order.status === 'test' ? form(path, `<input type="hidden" name="action" value="review-order"><input type="hidden" name="order" value="${order.id}">`, 'Mark test order reviewed') : form(path, `<input type="hidden" name="action" value="track-order"><input type="hidden" name="order" value="${order.id}">${input('tracking', 'Test tracking reference')}`, 'Save tracking reference')}</article>`).join('')}`);
        }
      } else page(res, 'Page unavailable', '', 404);
    } catch (error) {
      if (!error.status) console.error('Shop request failed', error.code || error.name);
      if (!res.headersSent) page(res, error.status ? 'Check your request' : 'Shop temporarily unavailable',
        error.status ? `<p>${escape(error.message)}</p>` : '', error.status || 503);
    }
    return true;
  }
  return handle;
}
module.exports = { commerce, supplierRows };
