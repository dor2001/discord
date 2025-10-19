import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("http://localhost:3001/health")
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Health check error:", error)
    return NextResponse.json({ status: "error", error: "Bot not initialized" }, { status: 503 })
  }
}
