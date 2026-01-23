# ngaj Backend Production Dockerfile
# Build: docker build -t ngaj/backend -f packages/backend/Dockerfile .
# Run from project root to include packages/shared

FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies
RUN npm ci --workspace=@ngaj/shared --workspace=@ngaj/backend

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Build shared first, then backend
RUN npm run build -w @ngaj/shared
RUN npm run build -w @ngaj/backend

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/

# Copy root package.json for workspace resolution
COPY package.json ./

# Install production dependencies only
RUN npm ci --workspace=@ngaj/backend --omit=dev

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run backend
CMD ["node", "packages/backend/dist/index.js"]
