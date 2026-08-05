import { PermissionFlagsBits, ChannelType, EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { buildTicketActionRows } from "../utils/ticketComponents.js";

export async function handleMessageCreate(message) {
  if (message.author.bot || !message.guild || !message.member) return;

  let guildData;
  try {
    const { data } = await api.get(`/api/customization/bot/${message.guild.id}/full`);
    guildData = data;
  } catch {
    return;
  }

  const prefix = (guildData.quickAddCommand || "").trim();
  if (!guildData.quickAddEnabled || !prefix) return;
  if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const staffRoleIds = guildData.staffRoles.map((r) => r.roleId);
  const isStaff =
    message.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
    message.member.roles.cache.some((r) => staffRoleIds.includes(r.id));
  if (!isStaff) return;

  const targetUser = message.mentions.users.first();
  if (!targetUser) {
    return message.reply(`Usage: \`${prefix} @user\` — mention the person you want to open a ticket for.`);
  }

  if (!guildData.quickAddPanelId) {
    return message.reply("No panel is set up for quick tickets yet — pick one on the dashboard's **Quick Commands** page.");
  }

  let panel;
  try {
    const { data } = await api.get(`/api/panels/bot/${guildData.quickAddPanelId}`);
    panel = data;
  } catch {
    return message.reply("Couldn't find the configured quick-ticket panel — check the dashboard's Quick Commands settings.");
  }

  try {
    const { data: openCheck } = await api.get("/api/tickets/bot/open-count", {
      params: { panelId: panel.id, openerId: targetUser.id },
    });
    if (openCheck.count >= panel.maxOpenPerUser) {
      return message.reply(`${targetUser} already has ${openCheck.count} open ticket(s) for this panel.`);
    }

    const number = (await api.get(`/api/tickets/guild/${message.guild.id}`).catch(() => ({ data: [] }))).data.length + 1;
    const channelName = panel.namingPattern
      .replace("{number}", String(number).padStart(4, "0"))
      .replace("{username}", targetUser.username)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    const overwrites = [
      { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: targetUser.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: message.author.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      },
      {
        id: message.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageRoles,
        ],
      },
      ...staffRoleIds.map((roleId) => ({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
      })),
    ];

    const channel = await message.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: panel.ticketCategoryId || undefined,
      permissionOverwrites: overwrites,
    });

    const ticket = (
      await api.post("/api/tickets/bot", {
        guildId: message.guild.id,
        panelId: panel.id,
        channelId: channel.id,
        openerId: targetUser.id,
        openerUsername: targetUser.username,
      })
    ).data;

    const branding = guildData.branding || {};
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`Ticket #${ticket.number}`)
      .setDescription(branding.welcomeMessage || "Thanks for reaching out! Support will be with you shortly.")
      .setColor(branding.primaryColor || panel.embedColor)
      .setFooter({ text: branding.footerText || "Powered by Ticket Zick" });

    await channel.send({
      content: `${targetUser} ${message.author}`,
      embeds: [welcomeEmbed],
      components: buildTicketActionRows(),
    });

    const confirmation = await message.reply(`Created ${channel} for ${targetUser}.`);
    setTimeout(() => confirmation.delete().catch(() => {}), 8000);
    await message.delete().catch(() => {});
  } catch (err) {
    console.error("quick-add failed:", err.code || err.message);
    if (err.code === 50013 || err.code === 50001) {
      return message.reply(
        "I don't have permission to create a channel here. Check Server Settings → Roles → Ticket Zick has **Manage Channels**."
      );
    }
    return message.reply("Something went wrong creating that ticket. Check the bot's logs for details.");
  }
}
