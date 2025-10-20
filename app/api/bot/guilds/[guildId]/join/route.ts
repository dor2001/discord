import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params
    const body = await _request.json()
    const { channelId } = body

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID is required" }, { status: 400 })
    }

    const response = await fetch(`http://localhost:3001/guild/${guildId}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId }),
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Join voice channel error:", error)
    return NextResponse.json({ error: "Failed to join voice channel" }, { status: 500 })
  }
}
