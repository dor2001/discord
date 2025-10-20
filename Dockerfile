FROM node:22-alpine AS base

RUN apk add --no-cache python3 py3-pip ffmpeg libsodium-dev curl && \
    python3 -m pip install --no-cache-dir --break-system-packages yt-dlp && \
    rm -rf /var/cache/apk/* /tmp/* /root/.cache /root/.npm

WORKDIR /app

FROM base AS builder

ARG DISCORD_TOKEN
ARG ADMIN_USER
ARG ADMIN_PASS
ARG PIPED_INSTANCE
ARG SESSION_SECRET
ARG DATA_PATH
ARG COOKIES_PATH

ENV DISCORD_TOKEN=${DISCORD_TOKEN}
ENV ADMIN_USER=${ADMIN_USER}
ENV ADMIN_PASS=${ADMIN_PASS}
ENV PIPED_INSTANCE=${PIPED_INSTANCE}
ENV SESSION_SECRET=${SESSION_SECRET}
ENV DATA_PATH=${DATA_PATH:-./data}
ENV COOKIES_PATH=${COOKIES_PATH:-./data/cookies.txt}

COPY package*.json ./

RUN npm install --no-audit --no-fund --prefer-offline && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.cache /root/.npm

COPY . .

RUN npm run build && \
    rm -rf node_modules && \
    npm install --omit=dev --no-audit --no-fund --prefer-offline && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.cache /root/.npm

FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/healthcheck.js ./healthcheck.js
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000 3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/bot/health || exit 1

CMD ["node", "server.js"]
