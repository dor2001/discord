import { NextResponse } from "next/server"
import { loadState } from "@/bot/state-manager"

export async function GET() {
  try {
    const state = loadState()

    if (!state) {
      return NextResponse.json({
        status: "starting",
        guilds: 0,
        uptime: 0,
      })
    }

    return NextResponse.json({
      status: state.isReady ? "healthy" : "starting",
      guilds: state.guilds.length,
      lastUpdate: state.lastUpdate,
    })
  } catch (error) {
    console.error("[v0] Health check error:", error)
    return NextResponse.json({ status: "error", error: "Bot not initialized" }, { status: 503 })
  }
}
