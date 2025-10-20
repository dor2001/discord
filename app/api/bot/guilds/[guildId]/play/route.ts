import { NextResponse } from "next/server"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    const { guildId } = await params
    const body = await _request.json()

    console.log("[v0] Play request for guild:", guildId, "track:", body.track?.title)

    const response = await fetch(`http://localhost:3001/guild/${guildId}/play`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error("[v0] Play failed:", error)
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    console.log("[v0] Play successful:", data)
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Play error:", error)
    return NextResponse.json({ error: "Failed to play track" }, { status: 500 })
  }
}
