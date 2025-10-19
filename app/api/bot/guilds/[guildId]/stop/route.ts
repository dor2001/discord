import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData || !guildData.player) {
      return NextResponse.json({ error: "Not in a voice channel" }, { status: 400 })
    }

    guildData.player.stop()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Stop error:", error)
    return NextResponse.json({ error: "Failed to stop" }, { status: 500 })
  }
}
