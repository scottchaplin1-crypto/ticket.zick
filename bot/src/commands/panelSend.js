import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import { api } from "../utils/api.js";

const STYLE_MAP = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

export async function handlePanelSend(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
    return interaction.reply({ content: "You need **Manage Server** to do this.", ephemeral: true });
  }

  const panelId = interaction.options.getString("panel_id");

  // Acknowledge immediately — Discord only waits 3 seconds for a response, and our
  // backend can take longer than that to wake up if it's been idle (Render free plan).
  await interaction.deferReply({ ephemeral: true });

  let panel;
  try {
    const { data } = await api.get(`/api/panels/bot/${panelId}`);
    panel = data;
  } catch {
    return interaction.editReply({ content: "Couldn't find that panel — check the ID in the dashboard." });
  }

  if (panel.guildId !== interaction.guildId) {
    return interaction.editReply({ content: "That panel belongs to a different server." });
  }

  const embed = new EmbedBuilder()
    .setTitle(panel.embedTitle)
    .setDescription(panel.embedDescription)
    .setColor(panel.embedColor);
  if (panel.embedImageUrl) embed.setImage(panel.embedImageUrl);
  if (panel.embedThumbnailUrl) embed.setThumbnail(panel.embedThumbnailUrl);

  const button = new ButtonBuilder()
    .setCustomId(`tz_open:${panel.id}`)
    .setLabel(panel.buttonLabel)
    .setEmoji(panel.buttonEmoji || undefined)
    .setStyle(STYLE_MAP[panel.buttonStyle] ?? ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  const message = await interaction.channel.send({ embeds: [embed], components: [row] });

  await api.patch(`/api/panels/bot/${panel.id}/message`, {
    channelId: interaction.channel.id,
    messageId: message.id,
  });

  await interaction.editReply({ content: "Panel posted!" });
}
