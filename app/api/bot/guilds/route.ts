import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function GET() {
  try {
    await requireAuth()

    const bot = getBotInstance()
    console.log("[v0] API: Getting guilds, bot ready:", bot.client.isReady(), "guilds count:", bot.guilds.size)
    const guilds = bot.getGuilds()
    console.log("[v0] API: Returning guilds:", guilds)

    return NextResponse.json({ guilds })
  } catch (error) {
    console.error("[v0] Get guilds error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
