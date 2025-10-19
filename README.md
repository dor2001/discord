
# Discord Music Bot + Web Dashboard

Features:
- Select **Guild** and **Voice Channel**
- **Lock** bot to a voice channel
- YouTube **search** via `yt-dlp` (no API key)
- **Play/Stop**
- **Seek** to any time in the track
- Minimal web UI (served at `/`)
- Healthcheck endpoint `/healthz`

## ENV
- `DISCORD_TOKEN` (required)
- `CLIENT_ID` (optional, for slash commands owner check)
- `PANEL_PORT` (default: 3000)

## Run
```
npm install
DISCORD_TOKEN=YOUR_TOKEN node src/bot.js
```
