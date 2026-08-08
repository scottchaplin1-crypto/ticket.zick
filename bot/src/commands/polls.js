import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { parseDuration } from "../utils/duration.js";

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export async function handlePollCreate(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const question = interaction.options.getString("question");
  const optionsRaw = interaction.options.getString("options");
  const durationInput = interaction.options.getString("duration");

  const options = optionsRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (options.length < 2) {
    return interaction.editReply("Give at least 2 options, separated by commas — e.g. `Pizza, Tacos, Sushi`.");
  }

  const durationMs = parseDuration(durationInput);
  if (!durationMs) {
    return interaction.editReply("Couldn't understand that duration — use something like `30m`, `2h`, `1d`, or `1w`.");
  }

  try {
    const endsAt = new Date(Date.now() + durationMs).toISOString();
    const { data: poll } = await api.post(`/api/polls/bot/${interaction.guildId}/create`, {
      question,
      options,
      channelId: interaction.channelId,
      endsAt,
      hostId: interaction.user.id,
    });

    const endsUnix = Math.floor(new Date(endsAt).getTime() / 1000);
    const embed = new EmbedBuilder()
      .setTitle(`📊 POLL: ${question}`)
      .setDescription(options.map((o, i) => `${OPTION_EMOJIS[i]} ${o}`).join("\n"))
      .addFields({ name: "Ends", value: `<t:${endsUnix}:R> (<t:${endsUnix}:F>)` }, { name: "Hosted by", value: `<@${interaction.user.id}>` })
      .setColor(0x5865f2)
      .setFooter({ text: "Results are revealed once voting closes — vote anytime before then, changing your mind is fine." });

    const rows = [];
    for (let i = 0; i < options.length; i += 5) {
      const buttons = options.slice(i, i + 5).map((o, j) => ({
        type: 2,
        style: 2,
        custom_id: `tz_poll:${poll.id}:${i + j}`,
        label: options[i + j].slice(0, 80),
        emoji: { name: OPTION_EMOJIS[i + j] },
      }));
      rows.push({ type: 1, components: buttons });
    }

    const message = await interaction.channel.send({ embeds: [embed], components: rows });
    await api.patch(`/api/polls/bot/${poll.id}/message`, { messageId: message.id });
    await interaction.editReply("Poll started! 📊");
  } catch (err) {
    console.error("poll create failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't create the poll.");
  }
}

export async function handlePollEnd(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const { data: active } = await api.get(`/api/polls/bot/${interaction.guildId}/active-in-channel/${interaction.channelId}`);
    if (!active) return interaction.editReply("No active poll in this channel.");
    await api.post(`/api/polls/bot/${active.id}/end`);
    await interaction.editReply("Poll ended and results posted.");
  } catch (err) {
    console.error("poll end failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't end the poll.");
  }
}

export async function handlePollVoteButton(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const [, pollId, optionIndex] = interaction.customId.split(":");

  try {
    const { data: result } = await api.post(`/api/polls/bot/${pollId}/vote`, {
      userId: interaction.user.id,
      optionIndex: parseInt(optionIndex, 10),
    });
    await interaction.editReply(`✅ Voted for **${result.votedFor}**. You can change your vote anytime before the poll ends.`);
  } catch (err) {
    const message = err.response?.data?.error || "Couldn't record your vote.";
    await interaction.editReply(message);
  }
}
