import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      username: session.username,
    })
  } catch (error) {
    console.error("[v0] Session check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
