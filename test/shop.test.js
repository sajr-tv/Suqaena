const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { test } = require('node:test');
const { Pool } = require('pg');
const { supplierRows } = require('../commerce');

const header = 'supplier,product_id,sku,title,description,specifications,category,fabric,size,color,wholesale_aed,quantity,source_url,images,image_permission';
const sample = header + '\nFixture,001,SKU-1,Test Suit,Sample only,Three pieces,Luxury Pret,Lawn,M,Red,60,4,https://www.alibaba.com/product-detail/example.html,https://images.example.com/test.jpg,yes';
test('CSV validates authorization-related fields, grouping and margin', () => {
  const [product] = supplierRows(sample, 40, ['images.example.com']);
  assert.equal(product.data.variants[0].price, 100);
  assert.throws(() => supplierRows(sample, 40, []), /approved HTTPS host/);
  assert.throws(() => supplierRows(sample.replace(',yes', ',no'), 40, ['images.example.com']), /permission/);
  assert.throws(() => supplierRows(sample + '\n' + sample.split('\n')[1], 40, ['images.example.com']), /Duplicate variant/);
});

test('catalogue and test checkout against disposable PostgreSQL', {
  skip: !process.env.SHOP_TEST_DATABASE_URL, timeout: 20000
}, async t => {
  const pool = new Pool({ connectionString: process.env.SHOP_TEST_DATABASE_URL });
  const schema = 'shop_test_' + process.pid;
  await pool.query(`CREATE SCHEMA ${schema}`);
  const db = new URL(process.env.SHOP_TEST_DATABASE_URL);
  db.searchParams.set('options', '-c search_path=' + schema);
  const admin = 'admin@example.test';
  const password = 'test-only-password-12345';
  const origin = 'http://127.0.0.1:3198';
  const server = spawn(process.execPath, ['server.js'], { env: {
    ...process.env, PORT: '3198', DATABASE_URL: db.href, SHOP_ORIGIN: origin,
    SHOP_ADMIN_EMAIL: admin, SHOP_ADMIN_PASSWORD: password,
    SUPPLIER_IMAGE_HOSTS: 'images.example.com', SHOP_TEST_CHECKOUT: 'true',
    SHOP_SHIPPING_JSON: '{"AE":{"fee":12,"rate":1,"eta":"Test estimate"}}'
  }, stdio: 'inherit' });
  t.after(async () => {
    server.kill();
    await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool.end();
  });
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(origin + '/health')).ok) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const cookies = new Map();
  const request = async (path, fields, requestOrigin = origin) => {
    const response = await fetch(origin + path, {
      redirect: 'manual',
      headers: { Origin: requestOrigin, Cookie: [...cookies.values()].join('; ') },
      body: fields && new URLSearchParams(fields), method: fields ? 'POST' : 'GET'
    });
    for (const header of response.headers.getSetCookie()) {
      const item = header.split(';')[0];
      cookies.set(item.split('=')[0], item);
    }
    return { status: response.status, body: await response.text() };
  };

  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/shop/admin')).status, 403);
  assert.equal((await request('/shop/account', { email: admin, password, action: 'register' })).status, 400);
  assert.equal((await request('/shop/account', { email: admin, password })).status, 303);
  assert.equal((await request('/shop/admin', { action: 'import' }, 'https://untrusted.test')).status, 403);
  const fixture = { action: 'import', authorized: 'yes', csv: sample, margin: '40' };
  assert.equal((await request('/shop/admin', fixture)).status, 303);
  assert.doesNotMatch((await request('/shop')).body, /Test Suit/);
  assert.equal((await request('/shop/admin', { action: 'publish', id: '1' })).status, 400);
  assert.equal((await request('/shop/admin', { action: 'publish', id: '1', verified: 'yes' })).status, 303);
  assert.match((await request('/shop?category=Luxury+Pret')).body, /Test Suit/);
  assert.doesNotMatch((await request('/shop?category=Accessories')).body, /Test Suit/);
  const detail = (await request('/shop/product/1')).body;
  assert.match(detail, /images\.example\.com\/test\.jpg/);
  const variant = detail.match(/<option value="([^"]+)"/)[1];
  assert.equal((await request('/shop/cart', { variant })).status, 303);
  assert.match((await request('/shop/cart')).body, /Test Suit/);
  const checkout = (await request('/shop/checkout')).body;
  assert.match(checkout, /112\.00/);
  const request_id = checkout.match(/name="request_id" value="([^"]+)"/)[1];
  assert.equal((await request('/shop/checkout', { country: 'AE', request_id })).status, 303);
  assert.match((await request('/shop/account')).body, new RegExp(request_id));
  assert.equal((await request('/shop/admin', { action: 'review-order', order: request_id })).status, 303);
  assert.match((await request('/shop/account')).body, /test reviewed/);
  assert.equal((await request('/shop/admin', fixture)).status, 303);
  assert.doesNotMatch((await request('/shop')).body, /Test Suit/);
  assert.equal(Number((await pool.query(`SELECT count(*) FROM ${schema}.shop_products`)).rows[0].count), 1);
  assert.equal((await request('/shop/account', { action: 'logout' })).status, 303);
  assert.equal((await request('/shop/account', { email: 'customer@example.test', password, action: 'register' })).status, 303);
  assert.equal((await request('/shop/admin')).status, 403);
  assert.doesNotMatch((await request('/shop/account')).body, new RegExp(request_id));
});
