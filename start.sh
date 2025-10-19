#!/bin/sh

node dist/bot/start.js &

# Wait a bit for the bot to initialize
sleep 5

# Start the Next.js server
node server.js
