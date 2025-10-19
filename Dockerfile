FROM node:20-slim
RUN apt-get update && apt-get install -y ffmpeg python3-pip && pip3 install yt-dlp && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm","start"]
