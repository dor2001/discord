# ===== Base =====
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PRISM_MEDIA_OPUS=opusscript

# מערכת בסיס + ffmpeg סטטי + yt-dlp בינארי
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates xz-utils \
 && arch="$(uname -m)" \
 && if [ "$arch" = "x86_64" ] || [ "$arch" = "amd64" ]; then \
      echo ">> Using static ffmpeg build (amd64)"; \
      curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ffmpeg.tar.xz; \
      tar -xf /tmp/ffmpeg.tar.xz -C /tmp; \
      mv /tmp/ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ffmpeg; \
      mv /tmp/ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ffprobe; \
      chmod +x /usr/local/bin/ffmpeg /usr/local/bin/ffprobe; \
    else \
      echo ">> Fallback to apt ffmpeg for $arch"; \
      apt-get install -y --no-install-recommends ffmpeg; \
    fi \
 && echo ">> Installing yt-dlp binary" \
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && yt-dlp --version \
 && ffmpeg -version

# ===== App =====
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# ניקוי
RUN rm -rf /var/lib/apt/lists/* /tmp/*

VOLUME ["/app/data"]

ENV PANEL_PORT=3000
EXPOSE 3000

# ---- HEALTHCHECK (חדש) ----
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PANEL_PORT:-3000}/healthz" >/dev/null || exit 1

# Entrypoint
CMD ["npm","start"]
