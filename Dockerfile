FROM oven/bun:1.4.4 AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json bun.lock ./

# Install dependencies with frozen lockfile for reproducible builds
RUN bun install --frozen-lockfile --production

# Production stage
FROM oven/bun:1.4.4-slim

# Set production environment
ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy only required runtime files (explicitly list for better security and smaller image)
COPY index.mjs ./
COPY css.mjs ./
COPY css2.mjs ./
COPY gather-fonts.mjs ./
COPY subsets.json ./
COPY font-versions-cache.json ./

# Copy environment template
COPY .env-template ./.env

# Use the non-root "bun" user that the base image provides
RUN chown -R bun:bun /app

USER bun

# Expose the application port
EXPOSE 3000

# Health check using bun (no need for curl); do not follow the production redirect to the external site
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/', { redirect: 'manual' }).then(r => process.exit(r.status < 400 ? 0 : 1)).catch(() => process.exit(1))"

# Start the application
CMD ["bun", "run", "start"]
