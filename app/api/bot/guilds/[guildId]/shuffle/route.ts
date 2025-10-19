import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { enabled } = body

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData || !guildData.player) {
      return NextResponse.json({ error: "Not in a voice channel" }, { status: 400 })
    }

    guildData.player.setShuffle(enabled)

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("[v0] Shuffle error:", error)
    return NextResponse.json({ error: "Failed to set shuffle" }, { status: 500 })
  }
}
