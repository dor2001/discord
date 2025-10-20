import { NextResponse } from "next/server"

export async function GET(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    const { guildId } = await params

    const res = await fetch(`http://localhost:3001/guild/${guildId}/player`)
    const data = await res.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Player route error:", error)
    return NextResponse.json({ error: "Failed to fetch player status" }, { status: 500 })
  }
}
