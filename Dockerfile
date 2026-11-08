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
USER node
EXPOSE 3000
CMD ["node", "server.js"]
