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
USER node
EXPOSE 3000
CMD ["node", "server.js"]
