import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"
import type { LoopMode } from "@/bot/music-player"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { mode } = body

    if (!["off", "track", "queue"].includes(mode)) {
      return NextResponse.json({ error: "Invalid loop mode" }, { status: 400 })
    }

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData || !guildData.player) {
      return NextResponse.json({ error: "Not in a voice channel" }, { status: 400 })
    }

    guildData.player.setLoopMode(mode as LoopMode)

    return NextResponse.json({ success: true, mode })
  } catch (error) {
    console.error("[v0] Loop error:", error)
    return NextResponse.json({ error: "Failed to set loop mode" }, { status: 500 })
  }
}
