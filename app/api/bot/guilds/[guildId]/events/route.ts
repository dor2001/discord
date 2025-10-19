import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { botEventEmitter } from "@/lib/event-emitter"

export async function GET(_request: Request, { params }: { params: Promise<{ guildId: string }> }) {
  try {
    await requireAuth()
    const { guildId } = await params

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()

        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        // Send initial connection message
        sendEvent({ type: "connected" })

        // Listen for player updates for this guild
        const handleUpdate = (event: any) => {
          if (event.guildId === guildId) {
            sendEvent(event)
          }
        }

        botEventEmitter.onPlayerUpdate(handleUpdate)

        // Cleanup on close
        _request.signal.addEventListener("abort", () => {
          botEventEmitter.offPlayerUpdate(handleUpdate)
          controller.close()
        })
      },
    })

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[v0] SSE error:", error)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
