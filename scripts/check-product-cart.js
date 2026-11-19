'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const source = fs.readFileSync('commerce.js', 'utf8');
// A comma after a route comparison turns the condition into an always-true expression.
assert.doesNotMatch(source, /path\s*===\s*['"][^'"]+['"]\s*,\s*['"][^'"]+['"]\s*&&/, 'Comma operator hijacks product routes');
const routes = [...source.matchAll(/path\s*===\s*['"](\/shop\/dress\/[^'"]+)['"]\s*&&\s*!post/g)].map(x=>x[1]);
assert.equal(new Set(routes).size, routes.length, 'Duplicate product-detail routes');
const blocks = [...source.matchAll(/path\s*===\s*['"](\/shop\/dress\/[^'"]+)['"]\s*&&\s*!post\)\s*\{([\s\S]*?)(?=\n\s*\}\s*else\s+if\s*\(|$)/g)];
const codes = new Map();
for (const [, route, body] of blocks) {
  const form = body.match(/<form[^>]*action="\/shop\/cart\/preview"[\s\S]*?<\/form>/);
  if (!form) continue;
  const product = form[0].match(/name="product"\s+value="([^"]+)"/)?.[1];
  const returnTo = form[0].match(/name="return_to"\s+value="([^"]+)"/)?.[1];
  if (!product && ['/shop/dress/leranath-yellow','/shop/dress/maroon-embroidered'].includes(route)) continue;
  assert(product, 'Missing cart product ID: ' + route);
  if (!['/shop/dress/leranath-yellow','/shop/dress/maroon-embroidered'].includes(route)) assert.equal(returnTo, route, 'Cart return route mismatch: ' + route);
  assert(!codes.has(product) || product === 'champagnebeige', 'Two dresses share cart product ID ' + product + ': ' + codes.get(product) + ' / ' + route);
  codes.set(product, route);
  if (product.startsWith('royal')) assert(source.includes("'preview-" + product + "-ONE'"), 'Missing unstitched basket product mapping: ' + product);
}
assert(codes.has('royalblackgold') && codes.has('royaltealblue'), 'Known distinct teal and black products must remain mapped');
console.log('Product routing/cart regression checks passed (' + codes.size + ' forms).');
