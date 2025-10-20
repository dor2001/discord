import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function POST(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const response = await fetch(`http://localhost:3001/guild/${guildId}/pause`, {
      method: "POST",
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Pause error:", error)
    return NextResponse.json({ error: "Failed to pause" }, { status: 500 })
  }
}
