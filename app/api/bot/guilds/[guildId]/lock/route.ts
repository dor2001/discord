import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { locked } = body

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 })
    }

    guildData.voiceChannelLocked = locked

    return NextResponse.json({ success: true, locked })
  } catch (error) {
    console.error("[v0] Lock voice channel error:", error)
    return NextResponse.json({ error: "Failed to lock voice channel" }, { status: 500 })
  }
}
