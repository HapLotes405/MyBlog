# ===== Stage 1: Build =====
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build-time env vars — Next.js inlines NEXT_PUBLIC_* at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build

# ===== Stage 2: Production =====
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public

# Next.js standalone output (includes server.js + minimal node_modules)
COPY --from=builder /app/.next/standalone ./

# Static assets (JS chunks, CSS, images — excluded from standalone)
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
