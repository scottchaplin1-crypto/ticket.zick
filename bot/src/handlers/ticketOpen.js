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

    const { data: countData } = await api.get(`/api/tickets/bot/panel/${panel.id}/count`).catch(() => ({ data: { count: 0 } }));
    const number = countData.count + 1;
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
          // Note: we deliberately do NOT include ManageRoles here. Discord blocks a
          // bot from granting itself "Manage Roles" via a per-channel permission
          // override unless it has full Administrator, even if it already holds
          // Manage Roles server-wide — which is enough on its own for /claim etc. to
          // work, since that's set at the role level in Server Settings → Roles.
        ],
      },
      ...[...new Set([...staffRoleIds, ...pingRoleIds])].map((roleId) => ({
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
      components: buildTicketActionRows(),
    });

    await interaction.editReply({ content: `Your ticket has been created: ${channel}` });
  } catch (err) {
    console.error("ticket-open failed:", err.code || err.message);
    if (err.code === 50013) {
      return interaction.editReply({
        content:
          "I don't have permission to create a channel here. In Discord, check Server Settings → Roles → Ticket Zick, and make sure **Manage Channels** is enabled — also check the ticket category (if you set one) allows the Ticket Zick role to manage/view it.",
      });
    }
    return interaction.editReply({ content: "Something went wrong creating your ticket. Check the bot's logs for details." });
  }
}
