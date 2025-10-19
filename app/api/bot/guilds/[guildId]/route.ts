import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function GET(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 })
    }

    const status = guildData.player?.getStatus() || null

    return NextResponse.json({
      guild: {
        guildId: guildData.guildId,
        guildName: guildData.guildName,
        voiceChannelId: guildData.voiceChannelId,
        voiceChannelLocked: guildData.voiceChannelLocked,
      },
      player: status,
    })
  } catch (error) {
    console.error("[v0] Get guild error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
