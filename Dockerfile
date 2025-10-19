# ===== Base =====
FROM node:20-slim

# פחות דיאלוגים ב-apt
ENV DEBIAN_FRONTEND=noninteractive
# מצב Production עבור Node
ENV NODE_ENV=production

# התקנות סיסטם: רק מה שחייבים
# - curl + ca-certificates להורדות HTTPS
# - ffmpeg:
#    * ב-AMD64: הורדה של בינארי סטטי קטן (ללא תלות בחבילות כבדות)
#    * בשאר הארכיטקטורות: התקנה דרך apt (כבדה יותר, אבל אמינה)
# - yt-dlp: בינארי רשמי קטן (ללא pip/Python)
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
 && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
       -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && rm -rf /var/lib/apt/lists/* /tmp/*

# ===== App =====
WORKDIR /app

# התקנת תלויות לפי ה-lock (מהיר ועקבי)
COPY package*.json ./
RUN npm ci --omit=dev

# קוד האפליקציה
COPY . .

# ווליום לנתונים מתמשכים (settings/history)
VOLUME ["/app/data"]

# ברירת מחדל לפורט הפאנל
ENV PANEL_PORT=3000
EXPOSE 3000

# בריאות (אופציונלי, אפשר להסיר אם לא תרצה)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PANEL_PORT||3000),res=>{if(res.statusCode<500)process.exit(0);process.exit(1)}).on('error',()=>process.exit(1))"

# הפעלה
CMD ["npm","start"]
