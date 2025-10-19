FROM node:22-alpine AS base

# Install dependencies for audio processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    libsodium-dev

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS deps
RUN npm install

# Build stage
FROM base AS builder

ARG DISCORD_TOKEN
ARG ADMIN_USER
ARG ADMIN_PASS
ARG CLIENT_ID
ARG PIPED_URL
ARG DASHBOARD_ORIGIN

ENV DISCORD_TOKEN=${DISCORD_TOKEN}
ENV ADMIN_USER=${ADMIN_USER}
ENV ADMIN_PASS=${ADMIN_PASS}
ENV CLIENT_ID=${CLIENT_ID}
ENV PIPED_INSTANCE=${PIPED_URL}
ENV DASHBOARD_ORIGIN=${DASHBOARD_ORIGIN}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js app
RUN npm run build

# Production stage
FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create app user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/bot ./bot
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/healthcheck.js ./healthcheck.js

# Create data directory for cookies and persistent data
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node healthcheck.js

CMD ["node", "--import", "tsx", "server.js"]
