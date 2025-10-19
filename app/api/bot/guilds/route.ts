import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"

export async function GET() {
  try {
    await requireAuth()

    const response = await fetch("http://localhost:3001/guilds")
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Get guilds error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
