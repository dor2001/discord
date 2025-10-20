FROM node:22-alpine AS base

RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    libsodium-dev && \
    python3 -m pip install --no-cache-dir --break-system-packages yt-dlp && \
    rm -rf /var/cache/apk/* /tmp/* /root/.cache

WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund && \
    npm cache clean --force

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
RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.cache

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

COPY --from=deps --chown=nextjs:nodejs /app/node_modules/discord.js ./node_modules/discord.js
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@discordjs ./node_modules/@discordjs
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/libsodium-wrappers ./node_modules/libsodium-wrappers
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/ws ./node_modules/ws
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prism-media ./node_modules/prism-media

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000 3001

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
