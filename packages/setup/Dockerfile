# ngaj Setup Wizard Dockerfile
# Build: docker build -t ngaj/setup -f packages/setup/Dockerfile .
# Run from project root to include packages/shared

FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/setup/package.json ./packages/setup/

# Install dependencies
RUN npm ci --workspace=@ngaj/shared --workspace=@ngaj/setup

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/setup ./packages/setup

# Build shared first, then setup
RUN npm run build -w @ngaj/shared
RUN npm run build -w @ngaj/setup

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/setup/dist ./packages/setup/dist
COPY --from=builder /app/packages/setup/package.json ./packages/setup/

# Copy root package.json for workspace resolution
COPY package.json ./

# Install production dependencies only
RUN npm ci --workspace=@ngaj/setup --omit=dev

# Volume for writing .env file to host
VOLUME ["/data"]

# Run setup wizard interactively
ENTRYPOINT ["node", "packages/setup/dist/index.js"]
