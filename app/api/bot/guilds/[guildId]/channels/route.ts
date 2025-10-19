import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3001"

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const response = await fetch(`${BOT_API_URL}/guild/${guildId}/channels`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Get channels error:", error)
    return NextResponse.json({ error: "Failed to get channels" }, { status: 500 })
  }
}
