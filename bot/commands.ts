import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { getBotInstance } from "./index.js"
import { YtDlpService } from "./ytdlp-service.js"
import { DistubePlayer } from "./distube-player.js"

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
  new SlashCommandBuilder()
    .setName("speed")
    .setDescription("Change playback speed")
    .addNumberOption((option) =>
      option
        .setName("rate")
        .setDescription("Playback speed (0.5x - 2.0x)")
        .setRequired(true)
        .setMinValue(0.5)
        .setMaxValue(2.0),
    ),
]

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const bot = getBotInstance()
  const guildId = interaction.guildId
  if (!guildId) {
    await interaction.reply({ content: "❌ הפקודה זמינה רק בשרתים", ephemeral: true })
    return
  }

  const guildData = bot.getGuildData(guildId)
  if (!guildData) {
    await interaction.reply({ content: "❌ שגיאה: לא נמצא מידע עבור השרת", ephemeral: true })
    return
  }

  try {
    switch (interaction.commandName) {
      case "join": {
        const member = interaction.member as any
        const voiceChannel = member?.voice?.channel

        if (!voiceChannel) {
          await interaction.reply({ content: "❌ אתה צריך להיות בערוץ קולי!", ephemeral: true })
          return
        }

        if (guildData.connection && guildData.voiceChannelId === voiceChannel.id) {
          await interaction.reply({ content: "✅ אני כבר בערוץ הקולי הזה!", ephemeral: true })
          return
        }

        await interaction.deferReply()
        const success = await bot.joinVoiceChannel(guildId, voiceChannel.id)

        if (success) {
          await interaction.editReply(`✅ הצטרפתי לערוץ **${voiceChannel.name}**`)
        } else {
          await interaction.editReply("❌ נכשל בהצטרפות לערוץ הקולי")
        }
        break
      }

      case "leave": {
        if (!guildData.connection) {
          await interaction.reply({ content: "❌ אני לא בערוץ קולי", ephemeral: true })
          return
        }

        const success = bot.leaveVoiceChannel(guildId)
        await interaction.reply(success ? "👋 עזבתי את הערוץ הקולי" : "❌ נכשל בעזיבת הערוץ")
        break
      }

      case "play": {
        const member = interaction.member as any
        const voiceChannel = member?.voice?.channel

        if (!voiceChannel) {
          await interaction.reply({ content: "❌ אתה צריך להיות בערוץ קולי!", ephemeral: true })
          return
        }

        if (!guildData.connection) {
          await interaction.deferReply()
          console.log("[v0] Bot not in voice channel, auto-joining...")
          const joinSuccess = await bot.joinVoiceChannel(guildId, voiceChannel.id)

          if (!joinSuccess) {
            await interaction.editReply("❌ נכשל בהצטרפות לערוץ הקולי")
            return
          }

          console.log("[v0] Successfully auto-joined voice channel")
        } else if (guildData.voiceChannelId !== voiceChannel.id) {
          await interaction.reply({
            content: "❌ אני כבר בערוץ קולי אחר! השתמש ב-/leave ואז /join כדי לעבור ערוץ",
            ephemeral: true,
          })
          return
        } else {
          await interaction.deferReply()
        }

        const query = interaction.options.getString("query", true)

        try {
          if (!guildData.player) {
            const client = bot.getClient()
            guildData.player = new DistubePlayer(client, guildId)
          }

          console.log("[v0] Playing with DisTube:", query)
          await guildData.player.play(voiceChannel, query)
          await interaction.editReply(`✅ מנגן: **${query}**`)
        } catch (error) {
          console.error("[v0] Play command error:", error)
          await interaction.editReply("❌ שגיאה בחיפוש או הוספת השיר")
        }
        break
      }

      case "pause": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        guildData.player.pause()
        await interaction.reply("⏸️ השיר נעצר")
        break
      }

      case "resume": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        guildData.player.resume()
        await interaction.reply("▶️ השיר נמשיך")
        break
      }

      case "skip": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        guildData.player.skip()
        await interaction.reply("⏭️ קפץ לשיר הבא")
        break
      }

      case "stop": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        guildData.player.stop()
        await interaction.reply("⏹️ השחקן נעצר והתור נמחק")
        break
      }

      case "queue": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        const status = guildData.player.getStatus()
        const queue = status.queue

        if (!status.currentTrack && queue.length === 0) {
          await interaction.reply("📭 התור ריק")
          return
        }

        let message = ""

        if (status.currentTrack) {
          message += `🎵 **הנגן حاليا:**\n${status.currentTrack.track.title} - ${status.currentTrack.track.author}\n\n`
        }

        if (queue.length > 0) {
          message += `📋 **התור (${queue.length} שירים):**\n`
          queue.slice(0, 10).forEach((item, index) => {
            message += `${index + 1}. ${item.track.title} - ${item.track.author}\n`
          })

          if (queue.length > 10) {
            message += `\n...ו-${queue.length - 10} שירים נוספים`
          }
        }

        await interaction.reply(message)
        break
      }

      case "volume": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        const level = interaction.options.getInteger("level", true)
        guildData.player.setVolume(level)
        await interaction.reply(`🔊 مستوى الصوت שונה ל-${level}%`)
        break
      }

      case "loop": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        const mode = interaction.options.getString("mode", true) as "off" | "track" | "queue"
        guildData.player.setLoopMode(mode)

        const modeText = { off: "Off", track: "Track", queue: "Queue" }
        await interaction.reply(`🔁 מצב חזור שונה ל-${modeText[mode]}`)
        break
      }

      case "shuffle": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        const enabled = interaction.options.getBoolean("enabled", true)
        guildData.player.setShuffle(enabled)
        await interaction.reply(`🔀 השמירה ${enabled ? "הופעלת" : "הושבת"}`)
        break
      }

      case "nowplaying": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        const status = guildData.player.getStatus()

        if (!status.currentTrack) {
          await interaction.reply("❌ אין שיר ניגון حاليا")
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
🎵 **הנגן حاليا:**
**${track.title}**
👤 ${track.author}

${progressBar(position, duration)}
⏱️ ${formatTime(position)} / ${formatTime(duration)}

🔊 مستوى الصوت: ${status.volume}%
🔁 חזור: ${status.loopMode === "off" ? "Off" : status.loopMode === "track" ? "Track" : "Queue"}
🔀 השמירה: ${status.shuffleEnabled ? "הופעלת" : "הושבת"}
📋 התור: ${status.queue.length} שירים
        `

        await interaction.reply(message)
        break
      }

      case "speed": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין שחקן פעיל", ephemeral: true })
          return
        }

        const rate = interaction.options.getNumber("rate", true)
        guildData.player.setPlaybackSpeed(rate)
        await interaction.reply(`⚡ מהירות השמעה שונתה ל-${rate}x`)
        break
      }
    }
  } catch (error) {
    console.error("[v0] Command error:", error)
    if (interaction.deferred) {
      await interaction.editReply("❌ אירעה שגיאה בביצוע הפקודה")
    } else {
      await interaction.reply({ content: "❌ אירעה שגיאה בביצוע הפקודה", ephemeral: true })
    }
  }
}
