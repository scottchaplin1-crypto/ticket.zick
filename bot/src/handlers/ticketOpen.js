import { PermissionFlagsBits, ChannelType, EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { buildTicketActionRows } from "../utils/ticketComponents.js";

export async function handleTicketOpenButton(interaction) {
  // Acknowledge immediately, before any slower backend calls — see note in panelSend.js.
  await interaction.deferReply({ ephemeral: true });

  try {
    const panelId = interaction.customId.split(":")[1];

    const { data: panel } = await api.get(`/api/panels/bot/${panelId}`);

    const { data: openCheck } = await api.get("/api/tickets/bot/open-count", {
      params: { panelId, openerId: interaction.user.id },
    });
    if (openCheck.count >= panel.maxOpenPerUser) {
      return interaction.editReply({
        content: `You already have ${openCheck.count} open ticket(s) for this panel (max ${panel.maxOpenPerUser}).`,
      });
    }

    const { data: guildData } = await api.get(`/api/customization/bot/${interaction.guildId}/full`);
    const staffRoleIds = guildData.staffRoles.map((r) => r.roleId);
    const pingRoleIds = JSON.parse(panel.pingRoleIds || "[]");

    const number = (await api.get(`/api/tickets/guild/${interaction.guildId}`).catch(() => ({ data: [] }))).data.length + 1;
    const channelName = panel.namingPattern
      .replace("{number}", String(number).padStart(4, "0"))
      .replace("{username}", interaction.user.username)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    const overwrites = [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      // The bot must explicitly grant itself access too — otherwise denying @everyone
      // above locks the bot out of the very channel it just created.
      {
        id: interaction.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
