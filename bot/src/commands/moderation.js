import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

// Accepts either a mention (<@123...>) or a raw numeric ID typed directly — using a
// plain string option instead of Discord's built-in "User" picker specifically so
// this works on people who aren't (or never were) a member of this server.
function parseUserId(input) {
  const mentionMatch = input.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d{15,21}$/.test(input.trim())) return input.trim();
  return null;
}

async function logCase(interaction, { action, targetId, targetTag, reason }) {
  try {
    await api.post(`/api/moderation/bot/${interaction.guildId}/log-case`, {
      action,
      targetId,
      targetTag,
      moderatorId: interaction.user.id,
      reason: reason || null,
    });

    const { data: config } = await api.get(`/api/moderation/bot/${interaction.guildId}`);
    if (!config?.modLogChannelId) return;
    const channel = await interaction.guild.channels.fetch(config.modLogChannelId).catch(() => null);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(action === "ban" ? "🔨 Member Banned" : "👢 Member Kicked")
      .addFields(
        { name: "User", value: `${targetTag} (${targetId})` },
        { name: "Moderator", value: `<@${interaction.user.id}>` },
        { name: "Reason", value: reason || "No reason given" }
      )
      .setColor(action === "ban" ? 0xda373c : 0xfaa61a)
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error("Failed to log moderation case:", err.message);
  }
}

export async function handleBan(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userInput = interaction.options.getString("user");
  const reason = interaction.options.getString("reason");
  const targetId = parseUserId(userInput);

  if (!targetId) {
    return interaction.editReply("Couldn't understand that — mention someone (@user) or paste their raw Discord user ID.");
  }

  let targetTag = targetId;
  try {
    const user = await interaction.client.users.fetch(targetId);
    targetTag = user.tag;
  } catch {
    // Unknown user ID — proceed anyway, Discord itself will reject it if it's not
    // a real account, and this still supports banning IDs the bot can't look up.
  }

  try {
    await interaction.guild.members.ban(targetId, { reason: reason || `Banned by ${interaction.user.tag}` });
    await interaction.editReply(`🔨 Banned **${targetTag}**${reason ? ` — ${reason}` : ""}.`);
    await logCase(interaction, { action: "ban", targetId, targetTag, reason });
  } catch (err) {
    console.error("ban failed:", err.code || err.message);
    await interaction.editReply(
      "Couldn't ban that user — check the bot has **Ban Members** permission and is positioned above their highest role."
    );
  }
}

export async function handleKick(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const userInput = interaction.options.getString("user");
  const reason = interaction.options.getString("reason");
  const targetId = parseUserId(userInput);

  if (!targetId) {
    return interaction.editReply("Couldn't understand that — mention someone (@user) or paste their raw Discord user ID.");
  }

  let member;
  try {
    member = await interaction.guild.members.fetch(targetId);
  } catch {
    return interaction.editReply("That user isn't in this server — kick only works on current members (use /ban for someone who isn't here).");
  }

  try {
    await member.kick(reason || `Kicked by ${interaction.user.tag}`);
    await interaction.editReply(`👢 Kicked **${member.user.tag}**${reason ? ` — ${reason}` : ""}.`);
    await logCase(interaction, { action: "kick", targetId, targetTag: member.user.tag, reason });
  } catch (err) {
    console.error("kick failed:", err.code || err.message);
    await interaction.editReply(
      "Couldn't kick that user — check the bot has **Kick Members** permission and is positioned above their highest role."
    );
  }
}
