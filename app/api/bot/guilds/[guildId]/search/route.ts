import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

const BOT_API_URL = process.env.BOT_API_URL || "http://localhost:3001"

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const response = await fetch(`${BOT_API_URL}/search?q=${encodeURIComponent(query)}`)

    if (!response.ok) {
      throw new Error(`Bot API error: ${response.statusText}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
