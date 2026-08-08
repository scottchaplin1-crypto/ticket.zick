import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { api } from "../utils/api.js";
import { parseDuration } from "../utils/duration.js";

function giveawayEmbed(giveaway, entryCount) {
  const endsUnix = Math.floor(new Date(giveaway.endsAt).getTime() / 1000);
  const fields = [
    { name: "Hosted by", value: `<@${giveaway.hostId}>`, inline: true },
    { name: "Winners", value: String(giveaway.winnerCount), inline: true },
    { name: "Entries", value: String(entryCount ?? 0), inline: true },
    { name: "Ends", value: `<t:${endsUnix}:R> (<t:${endsUnix}:F>)` },
  ];
  if (giveaway.requiredRoleId) fields.push({ name: "Requirement", value: `Must have <@&${giveaway.requiredRoleId}>` });

  return new EmbedBuilder()
    .setTitle(`🎉 GIVEAWAY: ${giveaway.prize}`)
    .setDescription(giveaway.description || null)
    .addFields(fields)
    .setColor(0x5865f2);
}

export async function handleGiveawayStart(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const prize = interaction.options.getString("prize");
  const durationInput = interaction.options.getString("duration");
  const description = interaction.options.getString("description") || "";
  const winnerCount = interaction.options.getInteger("winners") || 1;
  const requiredRole = interaction.options.getRole("required_role");

  const durationMs = parseDuration(durationInput);
  if (!durationMs) {
    return interaction.editReply("Couldn't understand that duration — use something like `30m`, `2h`, `1d`, or `1w`.");
  }

  try {
    const endsAt = new Date(Date.now() + durationMs).toISOString();
    const { data: giveaway } = await api.post(`/api/giveaways/bot/${interaction.guildId}/create`, {
      prize,
      description,
      winnerCount,
      requiredRoleId: requiredRole?.id || null,
      channelId: interaction.channelId,
      endsAt,
      hostId: interaction.user.id,
    });

    const embed = giveawayEmbed(giveaway, 0);
    const button = { type: 1, components: [{ type: 2, style: 3, custom_id: `tz_giveaway:${giveaway.id}`, label: "🎉 Enter Giveaway" }] };
    const message = await interaction.channel.send({ embeds: [embed], components: [button] });

    await api.patch(`/api/giveaways/bot/${giveaway.id}/message`, { messageId: message.id });
    await interaction.editReply("Giveaway started! 🎉");
  } catch (err) {
    console.error("giveaway start failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't start the giveaway.");
  }
}

export async function handleGiveawayEnd(interaction) {
  await interaction.deferReply({ ephemeral: true });
  try {
    const { data: active } = await api.get(`/api/giveaways/bot/${interaction.guildId}/active-in-channel/${interaction.channelId}`);
    if (!active) return interaction.editReply("No active giveaway in this channel.");
    await api.post(`/api/giveaways/bot/${active.id}/end`);
    await interaction.editReply("Giveaway ended and winner(s) drawn.");
  } catch (err) {
    console.error("giveaway end failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't end the giveaway.");
  }
}

export async function handleGiveawayEntryButton(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const giveawayId = interaction.customId.split(":")[1];

  try {
    const { data: giveaway } = await api.get(`/api/giveaways/bot/${giveawayId}`);
    const hasRole = giveaway.requiredRoleId ? interaction.member.roles.cache.has(giveaway.requiredRoleId) : true;

    const { data: result } = await api.post(`/api/giveaways/bot/${giveawayId}/toggle-entry`, {
      userId: interaction.user.id,
      hasRole,
    });

    await interaction.editReply(result.entered ? `🎉 You're entered! (${result.count} total entries)` : "You left the giveaway.");

    // Keep the visible entry count on the embed up to date — cheap enough since
    // this only happens once per entry action, not on a timer.
    const updatedEmbed = giveawayEmbed(giveaway, result.count);
    await interaction.message.edit({ embeds: [updatedEmbed] }).catch(() => {});
  } catch (err) {
    const message = err.response?.data?.error || "Couldn't process that.";
    await interaction.editReply(message);
  }
}
