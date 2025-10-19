FROM node:20-slim


RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg yt-dlp \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY . .
EXPOSE 3000
CMD ["npm","start"]
