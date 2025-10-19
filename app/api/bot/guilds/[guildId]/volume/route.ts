import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { volume } = body

    if (typeof volume !== "number" || volume < 0 || volume > 100) {
      return NextResponse.json({ error: "Volume must be between 0 and 100" }, { status: 400 })
    }

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData || !guildData.player) {
      return NextResponse.json({ error: "Not in a voice channel" }, { status: 400 })
    }

    guildData.player.setVolume(volume)

    return NextResponse.json({ success: true, volume })
  } catch (error) {
    console.error("[v0] Volume error:", error)
    return NextResponse.json({ error: "Failed to set volume" }, { status: 500 })
  }
}
