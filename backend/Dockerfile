# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npx prisma generate

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Compiled app
COPY --from=builder /app/dist ./dist

# Prisma client (generated files)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Schema needed for db push / migrate at runtime
COPY prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main"]
