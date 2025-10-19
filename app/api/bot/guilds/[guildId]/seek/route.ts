import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3001"

export async function POST(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const { seconds } = await request.json()

    const response = await fetch(`${BOT_API_URL}/guild/${guildId}/seek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds }),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Seek error:", error)
    return NextResponse.json({ error: "Seek failed" }, { status: 500 })
  }
}
