import { PermissionFlagsBits, ChannelType, EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

export async function handleTicketOpenButton(interaction) {
  const panelId = interaction.customId.split(":")[1];

  const { data: panel } = await api.get(`/api/panels/bot/${panelId}`);

  const { data: openCheck } = await api.get("/api/tickets/bot/open-count", {
    params: { panelId, openerId: interaction.user.id },
  });
  if (openCheck.count >= panel.maxOpenPerUser) {
    return interaction.reply({
      content: `You already have ${openCheck.count} open ticket(s) for this panel (max ${panel.maxOpenPerUser}).`,
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

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
    ...staffRoleIds.map((roleId) => ({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    })),
  ];

  const channel = await interaction.guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: panel.ticketCategoryId || undefined,
    permissionOverwrites: overwrites,
  });

  const ticket = (
    await api.post("/api/tickets/bot", {
      guildId: interaction.guildId,
      panelId: panel.id,
      channelId: channel.id,
      openerId: interaction.user.id,
      openerUsername: interaction.user.username,
    })
  ).data;

  const branding = guildData.branding || {};
  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`Ticket #${ticket.number}`)
    .setDescription(branding.welcomeMessage || "Thanks for reaching out! Support will be with you shortly.")
    .setColor(branding.primaryColor || panel.embedColor)
    .setFooter({ text: branding.footerText || "Powered by Ticket Zick" });

  const pingText = pingRoleIds.length ? pingRoleIds.map((id) => `<@&${id}>`).join(" ") : "";

  await channel.send({
    content: `${interaction.user} ${pingText}`.trim(),
    embeds: [welcomeEmbed],
  });

  await interaction.editReply({ content: `Your ticket has been created: ${channel}` });
}
