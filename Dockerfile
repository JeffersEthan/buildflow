# ---- deps: install node modules ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ---- builder: generate Prisma client and build Next.js ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma needs a DATABASE_URL at generate time only for the schema datasource;
# a dummy value is fine because generate does not connect.
ENV DATABASE_URL="postgresql://buildflow:buildflow@localhost:5432/buildflow"
RUN npx prisma generate
RUN npm run build

# ---- runner: production image ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
VOLUME /app/uploads

USER nextjs
EXPOSE 3000

# Apply pending migrations, load demo seed data (idempotent), then start.
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npm start"]
