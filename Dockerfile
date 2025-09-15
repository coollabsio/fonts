FROM oven/bun:1.2.22 AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lockb ./

# Install dependencies with frozen lockfile for reproducible builds
RUN bun install --frozen-lockfile --production

# Production stage
FROM oven/bun:1.2.22-slim

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lockb ./

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy only required runtime files (explicitly list for better security and smaller image)
COPY index.mjs ./
COPY css.mjs ./
COPY css2.mjs ./
COPY subsets.json ./
COPY font-versions-cache.json ./

# Copy environment template
COPY .env-template ./.env

# Create a non-root user for security
RUN addgroup --system --gid 1001 bunjs && \
    adduser --system --uid 1001 bunjs && \
    chown -R bunjs:bunjs /app

# Switch to non-root user
USER bunjs

# Expose the application port
EXPOSE 3000

# Health check using bun (no need for curl)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "start"]
