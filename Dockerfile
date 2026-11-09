FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js commerce.js supplier-memo.js stripe-checkout.js ./
COPY public ./public
COPY suqaena-leranath-yellow-suit.png ./suqaena-leranath-yellow-suit.png
COPY suqaena-leranath-yellow-suit-side.png ./suqaena-leranath-yellow-suit-side.png
COPY suqaena-leranath-yellow-suit-detail.png ./suqaena-leranath-yellow-suit-detail.png
COPY suqaena-maroon-embroidered-suit-main.png ./suqaena-maroon-embroidered-suit-main.png
COPY suqaena-maroon-embroidered-suit-side.png ./suqaena-maroon-embroidered-suit-side.png
COPY suqaena-maroon-embroidered-suit-detail.png ./suqaena-maroon-embroidered-suit-detail.png
COPY suqaena-lemon-yellow-party-suit-main.png ./suqaena-lemon-yellow-party-suit-main.png
COPY suqaena-lemon-yellow-party-suit-side.png ./suqaena-lemon-yellow-party-suit-side.png
COPY suqaena-lemon-yellow-party-suit-detail.png ./suqaena-lemon-yellow-party-suit-detail.png
COPY suqaena-cream-mustard-suit-main.png ./suqaena-cream-mustard-suit-main.png
COPY suqaena-cream-mustard-suit-side.png ./suqaena-cream-mustard-suit-side.png
COPY suqaena-cream-mustard-suit-detail.png ./suqaena-cream-mustard-suit-detail.png
COPY suqaena-blue-floral-anarkali-main.png ./suqaena-blue-floral-anarkali-main.png
COPY suqaena-blue-floral-anarkali-side.png ./suqaena-blue-floral-anarkali-side.png
COPY suqaena-blue-floral-anarkali-detail.png ./suqaena-blue-floral-anarkali-detail.png
COPY suqaena-purple-anarkali-main.png ./suqaena-purple-anarkali-main.png
COPY suqaena-purple-anarkali-side.png ./suqaena-purple-anarkali-side.png
COPY suqaena-purple-anarkali-detail.png ./suqaena-purple-anarkali-detail.png
COPY suqaena-pink-anarkali-main.png ./suqaena-pink-anarkali-main.png
COPY suqaena-pink-anarkali-side.png ./suqaena-pink-anarkali-side.png
COPY suqaena-pink-anarkali-detail.png ./suqaena-pink-anarkali-detail.png
COPY suqaena-white-floral-anarkali-main.png ./suqaena-white-floral-anarkali-main.png
COPY suqaena-white-floral-anarkali-side.png ./suqaena-white-floral-anarkali-side.png
COPY suqaena-white-floral-anarkali-detail.png ./suqaena-white-floral-anarkali-detail.png
COPY suqaena-indigo-bloom-suit-main.png ./suqaena-indigo-bloom-suit-main.png
COPY suqaena-indigo-bloom-suit-side.png ./suqaena-indigo-bloom-suit-side.png
COPY suqaena-indigo-bloom-suit-detail.png ./suqaena-indigo-bloom-suit-detail.png
COPY suqaena-rose-bloom-anarkali-main.png ./suqaena-rose-bloom-anarkali-main.png
COPY suqaena-rose-bloom-anarkali-side.png ./suqaena-rose-bloom-anarkali-side.png
COPY suqaena-rose-bloom-anarkali-detail.png ./suqaena-rose-bloom-anarkali-detail.png
COPY suqaena-ivory-floral-anarkali-main.png ./suqaena-ivory-floral-anarkali-main.png
COPY suqaena-ivory-floral-anarkali-side.png ./suqaena-ivory-floral-anarkali-side.png
COPY suqaena-ivory-floral-anarkali-detail.png ./suqaena-ivory-floral-anarkali-detail.png
COPY suqaena-ivory-navy-embroidered-main.png ./suqaena-ivory-navy-embroidered-main.png
COPY suqaena-ivory-navy-embroidered-side.png ./suqaena-ivory-navy-embroidered-side.png
COPY suqaena-ivory-navy-embroidered-detail.png ./suqaena-ivory-navy-embroidered-detail.png
COPY suqaena-lavender-bloom-anarkali-main.png ./suqaena-lavender-bloom-anarkali-main.png
COPY suqaena-lavender-bloom-anarkali-side.png ./suqaena-lavender-bloom-anarkali-side.png
COPY suqaena-lavender-bloom-anarkali-detail.png ./suqaena-lavender-bloom-anarkali-detail.png
COPY suqaena-ivory-gold-sharara-main.png ./suqaena-ivory-gold-sharara-main.png
COPY suqaena-ivory-gold-sharara-side.png ./suqaena-ivory-gold-sharara-side.png
COPY suqaena-ivory-gold-sharara-detail.png ./suqaena-ivory-gold-sharara-detail.png
COPY suqaena-turquoise-blossom-suit-main.png ./suqaena-turquoise-blossom-suit-main.png
COPY suqaena-turquoise-blossom-suit-side.png ./suqaena-turquoise-blossom-suit-side.png
COPY suqaena-turquoise-blossom-suit-detail.png ./suqaena-turquoise-blossom-suit-detail.png
COPY suqaena-blush-peacock-anarkali-main.png ./suqaena-blush-peacock-anarkali-main.png
COPY suqaena-blush-peacock-anarkali-side.png ./suqaena-blush-peacock-anarkali-side.png
COPY suqaena-blush-peacock-anarkali-detail.png ./suqaena-blush-peacock-anarkali-detail.png
COPY suqaena-ivory-floral-satin-main.png ./suqaena-ivory-floral-satin-main.png
COPY suqaena-ivory-floral-satin-side.png ./suqaena-ivory-floral-satin-side.png
COPY suqaena-ivory-floral-satin-detail.png ./suqaena-ivory-floral-satin-detail.png
COPY suqaena-velora-maroon-elegance-main.png ./suqaena-velora-maroon-elegance-main.png
COPY suqaena-velora-maroon-elegance-side.png ./suqaena-velora-maroon-elegance-side.png
COPY suqaena-velora-maroon-elegance-detail.png ./suqaena-velora-maroon-elegance-detail.png
COPY suqaena-mustard-floral-suit-main.png ./suqaena-mustard-floral-suit-main.png
COPY suqaena-mustard-floral-suit-side.png ./suqaena-mustard-floral-suit-side.png
COPY suqaena-mustard-floral-suit-detail.png ./suqaena-mustard-floral-suit-detail.png
COPY suqaena-ivory-champagne-suit-main.png ./suqaena-ivory-champagne-suit-main.png
COPY suqaena-ivory-champagne-suit-side.png ./suqaena-ivory-champagne-suit-side.png
COPY suqaena-ivory-champagne-suit-detail.png ./suqaena-ivory-champagne-suit-detail.png
COPY suqaena-teal-floral-lawn-main.png ./suqaena-teal-floral-lawn-main.png
COPY suqaena-teal-floral-lawn-side.png ./suqaena-teal-floral-lawn-side.png
COPY suqaena-teal-floral-lawn-detail.png ./suqaena-teal-floral-lawn-detail.png
COPY suqaena-mint-floral-lawn-main.png ./suqaena-mint-floral-lawn-main.png
COPY suqaena-mint-floral-lawn-side.png ./suqaena-mint-floral-lawn-side.png
COPY suqaena-mint-floral-lawn-detail.png ./suqaena-mint-floral-lawn-detail.png
USER node
EXPOSE 3000
CMD ["node", "server.js"]
