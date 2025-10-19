import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getBotInstance } from "@/bot/index"

export async function GET() {
  try {
    await requireAuth()

    const bot = getBotInstance()
    const guilds = bot.getGuilds()

    return NextResponse.json({ guilds })
  } catch (error) {
    console.error("[v0] Get guilds error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
