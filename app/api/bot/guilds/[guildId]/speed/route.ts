import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    const { guildId } = await params
    const body = await request.json()
    const { speed } = body

    const res = await fetch(`http://localhost:3001/guild/${guildId}/speed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ speed }),
    })

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Speed route error:", error)
    return NextResponse.json({ error: "Failed to change playback speed" }, { status: 500 })
  }
}
