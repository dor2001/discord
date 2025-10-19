import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { track } = body

    if (!track) {
      return NextResponse.json({ error: "Track is required" }, { status: 400 })
    }

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData || !guildData.player) {
      return NextResponse.json({ error: "Not in a voice channel" }, { status: 400 })
    }

    await guildData.player.addToQueue(track)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Play error:", error)
    return NextResponse.json({ error: "Failed to play track" }, { status: 500 })
  }
}
