# ngaj Backend Production Dockerfile
# Build: docker build -t ziohimself/ngaj-backend -f packages/backend/Dockerfile .
# Run from project root to include packages/shared and packages/frontend

FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies
RUN npm ci --workspace=@ngaj/shared --workspace=@ngaj/backend --workspace=@ngaj/frontend

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend

# Build shared first, then backend and frontend
RUN npm run build -w @ngaj/shared
RUN npm run build -w @ngaj/backend
RUN npm run build -w @ngaj/frontend

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy workspace configuration (needed for npm ci)
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/backend/package.json ./packages/backend/

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/frontend/dist ./packages/frontend/dist

# Install production dependencies only for both workspaces
RUN npm ci --workspace=@ngaj/shared --workspace=@ngaj/backend --omit=dev

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Switch to non-root user (node user is built into node:alpine images)
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run backend
CMD ["node", "packages/backend/dist/index.js"]
