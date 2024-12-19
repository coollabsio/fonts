FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build stage (if needed)
# RUN bun run build

# Production stage
FROM oven/bun:1-slim

# Install curl
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lockb ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/*.mjs ./
COPY --from=builder /app/*.json ./
COPY --from=builder /app/.env-template ./.env

# Create a non-root user
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 bunjs && \
    chown -R bunjs:bunjs /app

USER bunjs

EXPOSE 3000

CMD ["bun", "run", "start"]
