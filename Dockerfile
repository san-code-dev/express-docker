# ===== BUILD STAGE =====
FROM node:24-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build


# ===== RUNTIME STAGE =====
FROM node:24-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
# tetap set variabel manual meskipun sudah ada di .env karena docker-compose tidak bisa membaca .env di dalam container karena beda lifecycle.

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY prisma.config.ts ./prisma.config.ts

EXPOSE 3000
CMD ["npm", "run", "start"]