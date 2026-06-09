# ===== Stage 1: Build =====
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL dependencies (including dev) for build
COPY package*.json ./
RUN npm ci --no-optional && npm cache clean --force

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --omit=dev && npm cache clean --force

# ===== Stage 2: Production =====
FROM node:20-alpine
WORKDIR /app

# Copy only production node_modules + dist from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 8000
CMD ["node", "dist/index.js"]
