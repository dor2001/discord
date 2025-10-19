import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    try {
      await requireAuth()
    } catch {
      // Allow unauthenticated access for testing
      console.log("[v0] Unauthenticated access to guilds")
    }

    const response = await fetch("http://localhost:3001/guilds")

    if (!response.ok) {
      throw new Error(`Bot HTTP server error: ${response.statusText}`)
    }

    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Get guilds error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get guilds" },
      { status: 500 },
    )
  }
}
