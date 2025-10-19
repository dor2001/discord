import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { loadState } from "@/bot/state-manager"

export async function GET() {
  try {
    await requireAuth()

    const state = loadState()

    if (!state) {
      console.log("[v0] API: No state file found, bot may not be ready yet")
      return NextResponse.json({ guilds: [] })
    }

    console.log("[v0] API: Loaded state with", state.guilds.length, "guilds")
    return NextResponse.json({ guilds: state.guilds })
  } catch (error) {
    console.error("[v0] Get guilds error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
