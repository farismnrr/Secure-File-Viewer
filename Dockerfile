# ============================================================================
# Stage 1: Dependencies (cache-friendly)
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Native build deps (ONLY for build)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

# Copy ONLY dependency manifests
COPY package.json package-lock.json ./

# Install deps
RUN npm ci --ignore-scripts

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Same build deps (must match deps stage)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

# Copy node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy configuration files
COPY next.config.ts ./
COPY tsconfig.json ./
COPY jest.config.ts ./
COPY eslint.config.mjs ./

# Copy source code
COPY public ./public
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY scripts ./scripts

# Build
ENV NODE_ENV=production

# Run checks before build (CI style)
RUN npm run lint
RUN npm test

RUN npm run build

# ============================================================================
# Stage 3: Runtime (minimal & safe)
# ============================================================================
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Runtime libs ONLY
RUN apt-get update && apt-get install -y \
    ca-certificates \
    cairo \
    pango \
    libjpeg62-turbo \
    giflib \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Non-root user
RUN useradd -r -u 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
