import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { pipedService } from "@/bot/piped-service"

export async function GET(request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const results = await pipedService.search(query)

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
