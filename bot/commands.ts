import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js"
import { getBotInstance } from "./index.js"
import { YtDlpService } from "./ytdlp-service.js"
import { MusicPlayer } from "./music-player.js"

const ytdlpService = new YtDlpService()

export const commands = [
  new SlashCommandBuilder().setName("join").setDescription("הצטרף לערוץ קולי").setNameLocalizations({ he: "הצטרף" }),

  new SlashCommandBuilder().setName("leave").setDescription("עזוב את הערוץ הקולי").setNameLocalizations({ he: "עזוב" }),

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("נגן שיר מ-YouTube")
    .setNameLocalizations({ he: "נגן" })
    .addStringOption((option) =>
      option.setName("query").setDescription("שם השיר או URL").setNameLocalizations({ he: "שאילתה" }).setRequired(true),
    ),

  new SlashCommandBuilder().setName("pause").setDescription("השהה את השיר הנוכחי").setNameLocalizations({ he: "השהה" }),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription("המשך את השיר הנוכחי")
    .setNameLocalizations({ he: "המשך" }),

  new SlashCommandBuilder().setName("skip").setDescription("דלג לשיר הבא").setNameLocalizations({ he: "דלג" }),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription("עצור את הנגן ונקה את התור")
    .setNameLocalizations({ he: "עצור" }),

  new SlashCommandBuilder().setName("queue").setDescription("הצג את תור השירים").setNameLocalizations({ he: "תור" }),

  new SlashCommandBuilder()
    .setName("volume")
    .setDescription("שנה את עוצמת הקול")
    .setNameLocalizations({ he: "עוצמה" })
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("רמת עוצמת הקול (0-100)")
        .setNameLocalizations({ he: "רמה" })
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(100),
    ),

  new SlashCommandBuilder()
    .setName("loop")
    .setDescription("שנה מצב חזרה")
    .setNameLocalizations({ he: "חזרה" })
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("מצב חזרה")
        .setNameLocalizations({ he: "מצב" })
        .setRequired(true)
        .addChoices({ name: "כבוי", value: "off" }, { name: "שיר", value: "track" }, { name: "תור", value: "queue" }),
    ),

  new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("הפעל/כבה ערבוב")
    .setNameLocalizations({ he: "ערבב" })
    .addBooleanOption((option) =>
      option.setName("enabled").setDescription("הפעל ערבוב").setNameLocalizations({ he: "מופעל" }).setRequired(true),
    ),

  new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("הצג את השיר הנוכחי")
    .setNameLocalizations({ he: "מתנגן_עכשיו" }),
]

export async function handleCommand(interaction: ChatInputCommandInteraction) {
  const bot = getBotInstance()
  const guildId = interaction.guildId
  if (!guildId) {
    await interaction.reply({ content: "❌ פקודה זו זמינה רק בשרתים", ephemeral: true })
    return
  }

  const guildData = bot.getGuildData(guildId)
  if (!guildData) {
    await interaction.reply({ content: "❌ שגיאה: לא נמצא מידע על השרת", ephemeral: true })
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

        await interaction.deferReply()
        const success = await bot.joinVoiceChannel(guildId, voiceChannel.id)

        if (success) {
          await interaction.editReply(`✅ הצטרפתי לערוץ **${voiceChannel.name}**`)
        } else {
          await interaction.editReply("❌ נכשלתי להצטרף לערוץ הקולי")
        }
        break
      }

      case "leave": {
        if (!guildData.connection) {
          await interaction.reply({ content: "❌ אני לא בערוץ קולי", ephemeral: true })
          return
        }

        const success = bot.leaveVoiceChannel(guildId)
        await interaction.reply(success ? "👋 עזבתי את הערוץ הקולי" : "❌ נכשלתי לעזוב את הערוץ")
        break
      }

      case "play": {
        if (!guildData.connection) {
          await interaction.reply({ content: "❌ אני לא בערוץ קולי! השתמש ב-/join קודם", ephemeral: true })
          return
        }

        const query = interaction.options.getString("query", true)
        await interaction.deferReply()

        try {
          const results = await ytdlpService.search(query)

          if (results.length === 0) {
            await interaction.editReply("❌ לא נמצאו תוצאות")
            return
          }

          const track = results[0]

          if (!guildData.player) {
            guildData.player = new MusicPlayer(guildData.connection, guildId)
          }

          await guildData.player.addToQueue(track)
          await interaction.editReply(`✅ נוסף לתור: **${track.title}** (${track.author})`)
        } catch (error) {
          console.error("[v0] Play command error:", error)
          await interaction.editReply("❌ שגיאה בחיפוש או הוספת השיר")
        }
        break
      }

      case "pause": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        guildData.player.pause()
        await interaction.reply("⏸️ השיר הושהה")
        break
      }

      case "resume": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        guildData.player.resume()
        await interaction.reply("▶️ השיר ממשיך")
        break
      }

      case "skip": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        guildData.player.skip()
        await interaction.reply("⏭️ דילגתי לשיר הבא")
        break
      }

      case "stop": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        guildData.player.stop()
        await interaction.reply("⏹️ הנגן נעצר והתור נוקה")
        break
      }

      case "queue": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
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
          message += `🎵 **מתנגן עכשיו:**\n${status.currentTrack.track.title} - ${status.currentTrack.track.author}\n\n`
        }

        if (queue.length > 0) {
          message += `📋 **תור (${queue.length} שירים):**\n`
          queue.slice(0, 10).forEach((item, index) => {
            message += `${index + 1}. ${item.track.title} - ${item.track.author}\n`
          })

          if (queue.length > 10) {
            message += `\n...ועוד ${queue.length - 10} שירים`
          }
        }

        await interaction.reply(message)
        break
      }

      case "volume": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        const level = interaction.options.getInteger("level", true)
        guildData.player.setVolume(level)
        await interaction.reply(`🔊 עוצמת הקול שונתה ל-${level}%`)
        break
      }

      case "loop": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        const mode = interaction.options.getString("mode", true) as "off" | "track" | "queue"
        guildData.player.setLoopMode(mode)

        const modeText = { off: "כבוי", track: "שיר", queue: "תור" }
        await interaction.reply(`🔁 מצב חזרה שונה ל-${modeText[mode]}`)
        break
      }

      case "shuffle": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        const enabled = interaction.options.getBoolean("enabled", true)
        guildData.player.setShuffle(enabled)
        await interaction.reply(`🔀 ערבוב ${enabled ? "הופעל" : "כובה"}`)
        break
      }

      case "nowplaying": {
        if (!guildData.player) {
          await interaction.reply({ content: "❌ אין נגן פעיל", ephemeral: true })
          return
        }

        const status = guildData.player.getStatus()

        if (!status.currentTrack) {
          await interaction.reply("❌ אין שיר מתנגן כרגע")
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
🎵 **מתנגן עכשיו:**
**${track.title}**
👤 ${track.author}

${progressBar(position, duration)}
⏱️ ${formatTime(position)} / ${formatTime(duration)}

🔊 עוצמה: ${status.volume}%
🔁 חזרה: ${status.loopMode === "off" ? "כבוי" : status.loopMode === "track" ? "שיר" : "תור"}
🔀 ערבוב: ${status.shuffleEnabled ? "מופעל" : "כבוי"}
📋 בתור: ${status.queue.length} שירים
        `

        await interaction.reply(message)
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
