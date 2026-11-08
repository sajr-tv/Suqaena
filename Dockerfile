FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js commerce.js ./
COPY public ./public
COPY suqaena-leranath-yellow-suit.png ./suqaena-leranath-yellow-suit.png
USER node
EXPOSE 3000
CMD ["node", "server.js"]
