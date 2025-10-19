import { NextResponse } from "next/server"
import { getBotInstance } from "@/bot/index"

export async function GET() {
  try {
    const bot = getBotInstance()
    const health = bot.getHealth()

    return NextResponse.json(health)
  } catch (error) {
    console.error("[v0] Health check error:", error)
    return NextResponse.json({ status: "error", error: "Bot not initialized" }, { status: 503 })
  }
}
