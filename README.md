# Discord Music Bot + Dashboard (Full)

Features:
- Login with username/password (env: `ADMIN_USER`, `ADMIN_PASS`)
- Select guild (server), list its **voice channels**, move the bot, lock to a channel
- Search via **Piped** (YouTube mirror) — no YouTube API keys needed
- Play queue per guild, pause/resume/skip/stop
- **Seek** to any timestamp (seconds) with duration display
- Web dashboard at `http://localhost:3000`

## Setup
1. Create `.env` from `.env.example` and fill values.
2. `npm install`
3. `npm start`

Required env:
- `DISCORD_TOKEN` — bot token
- `CLIENT_ID` — application client id
- `ADMIN_USER`, `ADMIN_PASS` — credentials for the dashboard
- Optional: `PIPED_URL` — mirror base (default `https://piped.video`)

## Docker
Build:
```bash
docker build -t dor-discord-full .
docker run --rm -p 3000:3000 -e DISCORD_TOKEN=xxx -e CLIENT_ID=xxx -e ADMIN_USER=admin -e ADMIN_PASS=admin123 dor-discord-full
```

## Notes
- This uses `ffmpeg` to stream audio from the Piped stream URL.
- Seeking restarts ffmpeg with `-ss <seconds>` for accurate jumps.
- If your host blocks the default Piped, set `PIPED_URL` to a different instance.
