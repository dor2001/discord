import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"
import { joinVoiceChannel } from "@discordjs/voice"
import { MusicPlayer } from "@/bot/music-player"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { channelId } = body

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 })
    }

    const bot = getBotInstance()
    const guildData = bot.getGuildData(guildId)

    if (!guildData) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 })
    }

    if (guildData.voiceChannelId && guildData.voiceChannelLocked) {
      return NextResponse.json({ error: "Voice channel is locked" }, { status: 403 })
    }

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      adapterCreator: bot.client.guilds.cache.get(guildId)?.voiceAdapterCreator as any,
    })

    const player = new MusicPlayer(connection, guildId)

    guildData.voiceChannelId = channelId
    guildData.connection = connection
    guildData.player = player

    return NextResponse.json({ success: true, channelId })
  } catch (error) {
    console.error("[v0] Join voice channel error:", error)
    return NextResponse.json({ error: "Failed to join voice channel" }, { status: 500 })
  }
}
