#!/bin/sh

# Start the Discord bot in the background
node --import tsx bot/start.ts &

# Wait a bit for the bot to initialize
sleep 5

# Start the Next.js server
node server.js
