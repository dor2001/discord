import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function GET(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const response = await fetch(`http://localhost:3001/guild/${guildId}`)

    if (!response.ok) {
      return NextResponse.json({ error: "Guild not found" }, { status: 404 })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Get guild error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
