import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { getBotInstance } from "./index.js"
import { YtDlpService } from "./ytdlp-service.js"
import { MusicPlayer } from "./music-player.js"

const ytdlpService = new YtDlpService()

export const commands = [
  new SlashCommandBuilder().setName("join").setDescription("Join a voice channel"),

  new SlashCommandBuilder().setName("leave").setDescription("Leave the voice channel"),

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube")
    .addStringOption((option) => option.setName("query").setDescription("Song name or URL").setRequired(true)),

  new SlashCommandBuilder().setName("pause").setDescription("Pause the current song"),

  new SlashCommandBuilder().setName("resume").setDescription("Resume the current song"),

  new SlashCommandBuilder().setName("skip").setDescription("Skip to the next song"),

  new SlashCommandBuilder().setName("stop").setDescription("Stop the player and clear the queue"),

  new SlashCommandBuilder().setName("queue").setDescription("Show the song queue"),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Change the volume")
    .addIntegerOption((option) =>
      option.setName("level").setDescription("Volume level (0-100)").setRequired(true).setMinValue(0).setMaxValue(100),
    ),

  new SlashCommandBuilder()
    .setName("loop")
    .setDescription("Change loop mode")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Loop mode")
        .setRequired(true)
        .addChoices(
          { name: "Off", value: "off" },
          { name: "Track", value: "track" },
          { name: "Queue", value: "queue" },
        ),
    ),

  new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Toggle shuffle")
    .addBooleanOption((option) => option.setName("enabled").setDescription("Enable shuffle").setRequired(true)),

  new SlashCommandBuilder().setName("nowplaying").setDescription("Show the current song"),
]

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const bot = getBotInstance()
  const guildId = interaction.guildId
  if (!guildId) {
    await interaction.reply({ content: "❌ Command available only in servers", ephemeral: true })
    return
  }

  const guildData = bot.getGuildData(guildId)
  if (!guildData) {
    await interaction.reply({ content: "❌ Error: No data found for the server", ephemeral: true })
    return
  }

  try {
    switch (interaction.commandName) {
      case "join": {
        const member = interaction.member as any
        const voiceChannel = member?.voice?.channel

        if (!voiceChannel) {
          await interaction.reply({ content: "❌ You need to be in a voice channel!", ephemeral: true })
          return
        }

        await interaction.deferReply()
        const success = await bot.joinVoiceChannel(guildId, voiceChannel.id)

        if (success) {
          await interaction.editReply(`✅ Joined channel **${voiceChannel.name}**`)
        } else {
          await interaction.editReply("❌ Failed to join the voice channel")
        }
        break
      }

      case "leave": {
        if (!guildData.connection) {
          await interaction.reply({ content: "❌ I am not in a voice channel", ephemeral: true })
          return
        }

        const success = bot.leaveVoiceChannel(guildId)
        await interaction.reply(success ? "👋 Left the voice channel" : "❌ Failed to leave the channel")
        break
      }

      case "play": {
        if (!guildData.connection) {
          await interaction.reply({ content: "❌ I am not in a voice channel! Use /join first", ephemeral: true })
          return
        }

        const query = interaction.options.getString("query", true)
        await interaction.deferReply()

        try {
          const results = await ytdlpService.search(query)

          if (results.length === 0) {
            await interaction.editReply("❌ No results found")
            return
          }

          const track = results[0]

          if (!guildData.player) {
            guildData.player = new MusicPlayer(guildData.connection, guildId)
          }

          await guildData.player.addToQueue(track)
          await interaction.editReply(`✅ Added to queue: **${track.title}** (${track.author})`)
        } catch (error) {
          console.error("[v0] Play command error:", error)
          await interaction.editReply("❌ Error in search or adding the song")
        }
        break
      }

      case "pause": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        guildData.player.pause()
        await interaction.reply("⏸️ Song paused")
        break
      }

      case "resume": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        guildData.player.resume()
        await interaction.reply("▶️ Song resumed")
        break
      }

      case "skip": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        guildData.player.skip()
        await interaction.reply("⏭️ Skipped to the next song")
        break
      }

      case "stop": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        guildData.player.stop()
        await interaction.reply("⏹️ Player stopped and queue cleared")
        break
      }

      case "queue": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        const status = guildData.player.getStatus()
        const queue = status.queue

        if (!status.currentTrack && queue.length === 0) {
          await interaction.reply("📭 Queue is empty")
          return
        }

        let message = ""

        if (status.currentTrack) {
          message += `🎵 **Now Playing:**\n${status.currentTrack.track.title} - ${status.currentTrack.track.author}\n\n`
        }

        if (queue.length > 0) {
          message += `📋 **Queue (${queue.length} songs):**\n`
          queue.slice(0, 10).forEach((item, index) => {
            message += `${index + 1}. ${item.track.title} - ${item.track.author}\n`
          })

          if (queue.length > 10) {
            message += `\n...and ${queue.length - 10} more songs`
          }
        }

        await interaction.reply(message)
        break
      }

      case "volume": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        const level = interaction.options.getInteger("level", true)
        guildData.player.setVolume(level)
        await interaction.reply(`🔊 Volume changed to ${level}%`)
        break
      }

      case "loop": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        const mode = interaction.options.getString("mode", true) as "off" | "track" | "queue"
        guildData.player.setLoopMode(mode)

        const modeText = { off: "Off", track: "Track", queue: "Queue" }
        await interaction.reply(`🔁 Loop mode changed to ${modeText[mode]}`)
        break
      }

      case "shuffle": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        const enabled = interaction.options.getBoolean("enabled", true)
        guildData.player.setShuffle(enabled)
        await interaction.reply(`🔀 Shuffle ${enabled ? "enabled" : "disabled"}`)
        break
      }

      case "nowplaying": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ No active player", ephemeral: true })
          return
        }

        const status = guildData.player.getStatus()

        if (!status.currentTrack) {
          await interaction.reply("❌ No song is currently playing")
          return
        }

        const track = status.currentTrack.track
        const position = Math.floor(status.currentPosition)
        const duration = track.duration

        const formatTime = (seconds: number) => {
          const mins = Math.floor(seconds / 60)
          const secs = seconds % 60
          return `${mins}:${secs.toString().padStart(2, "0")}`
        }

        const progressBar = (current: number, total: number, length = 20) => {
          const filled = Math.floor((current / total) * length)
          return "▬".repeat(filled) + "🔘" + "▬".repeat(length - filled)
        }

        const message = `
🎵 **Now Playing:**
**${track.title}**
👤 ${track.author}

${progressBar(position, duration)}
⏱️ ${formatTime(position)} / ${formatTime(duration)}

🔊 Volume: ${status.volume}%
🔁 Loop: ${status.loopMode === "off" ? "Off" : status.loopMode === "track" ? "Track" : "Queue"}
🔀 Shuffle: ${status.shuffleEnabled ? "Enabled" : "Disabled"}
📋 Queue: ${status.queue.length} songs
        `

        await interaction.reply(message)
        break
      }
    }
  } catch (error) {
    console.error("[v0] Command error:", error)
    if (interaction.deferred) {
      await interaction.editReply("❌ An error occurred while executing the command")
    } else {
      await interaction.reply({ content: "❌ An error occurred while executing the command", ephemeral: true })
    }
  }
}
