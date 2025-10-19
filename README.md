# Discord Music Bot + Web Dashboard (Multi-Guild, Seek/Jump Controls)

## Quick Start
1. Install Node 18+
2. Unzip the project, then:
```bash
cp .env.example .env
# Fill DISCORD_TOKEN and CLIENT_ID
npm i
npm run start
```
This starts the Discord bot **and** the web dashboard on the same process (port from `.env` PORT, default 3000).

- Open `http://localhost:3000` for the dashboard.
- Use the dashboard to pick a **Guild**, **Voice Channel**, control **Play/Pause/Skip/Stop**, **Forward/Back 10s**, **seek to time**, set **Volume**, and manage the **Queue**.
- Works across **multiple servers at once**. Each guild has its own independent player and queue.

## Notes
- Supports URLs or search queries (YouTube, SoundCloud, etc.) using `play-dl`.
- **Seek** recreates the stream at the requested timestamp (works while playing or paused).
- Slash commands are included as a fallback: `/join`, `/play`, `/pause`, `/resume`, `/skip`, `/seek`, `/np`, `/leave`.

If YouTube blocks unauthenticated playback, configure cookies in `play-dl` docs or try a VPN. 
