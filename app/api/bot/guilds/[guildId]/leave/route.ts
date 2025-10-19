import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 })
    }

    if (!guildData.voiceChannelId) {
      return NextResponse.json({ error: "Not in a voice channel" }, { status: 400 })
    }

    // Destroy player and disconnect
    if (guildData.player) {
      guildData.player.destroy()
      guildData.player = null
    }

    if (guildData.connection) {
      guildData.connection.destroy()
      guildData.connection = null
    }

    guildData.voiceChannelId = null

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Leave voice channel error:", error)
    return NextResponse.json({ error: "Failed to leave voice channel" }, { status: 500 })
  }
}
