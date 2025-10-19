# ===== Base =====
FROM node:20-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production

# מערכת בסיסית + כלים לקומפילציה של opus
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    curl ca-certificates xz-utils python3 make g++ \
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
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp

# ===== App =====
WORKDIR /app
COPY package*.json ./

# שים לב — npm install במקום npm ci כדי למנוע בעיות lockfile
RUN npm install --omit=dev

COPY . .

# לאחר ההתקנה, ננקה את הכלים הכבדים (נשאיר רק ריצה)
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* /tmp/*

# ווליום לשמירה על מידע
VOLUME ["/app/data"]

ENV PANEL_PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PANEL_PORT||3000),res=>{if(res.statusCode<500)process.exit(0);process.exit(1)}).on('error',()=>process.exit(1))"

CMD ["npm","start"]
