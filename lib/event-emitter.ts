import { EventEmitter } from "events"

export interface PlayerUpdateEvent {
  guildId: string
  type: "track_start" | "track_end" | "queue_update" | "player_state"
  data: any
}

class BotEventEmitter extends EventEmitter {
  public emitPlayerUpdate(event: PlayerUpdateEvent) {
    this.emit("player_update", event)
  }

  public onPlayerUpdate(callback: (event: PlayerUpdateEvent) => void) {
    this.on("player_update", callback)
  }

  public offPlayerUpdate(callback: (event: PlayerUpdateEvent) => void) {
    this.off("player_update", callback)
  }
}

export const botEventEmitter = new BotEventEmitter()
