import { PermissionFlagsBits, ChannelType, EmbedBuilder } from "discord.js";
import { api } from "./api.js";
import { buildTicketActionRows } from "./ticketComponents.js";

// Shared by every path that creates a ticket channel — the panel button (with or
// without a question form), and the $new quick-add command — so they all behave
// identically and any future fix only needs to happen in one place.
export async function createTicketChannel({ guild, client, panel, guildData, openerUser, extraUserId, answers }) {
  const staffRoleIds = guildData.staffRoles.map((r) => r.roleId);
  const pingRoleIds = JSON.parse(panel.pingRoleIds || "[]");

  const { data: countData } = await api.get(`/api/tickets/bot/panel/${panel.id}/count`).catch(() => ({ data: { count: 0 } }));
  const number = countData.count + 1;
  const channelName = panel.namingPattern
    .replace("{number}", String(number).padStart(4, "0"))
    .replace("{username}", openerUser.username)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: openerUser.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    // The bot must explicitly grant itself access too — otherwise denying @everyone
    // above locks the bot out of the very channel it just created. ManageRoles is
    // deliberately omitted (see notes elsewhere) — Discord blocks granting that via
    // a per-channel override without full Administrator.
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
    },
    ...[...new Set([...staffRoleIds, ...pingRoleIds])].map((roleId) => ({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    })),
  ];

  if (extraUserId && extraUserId !== openerUser.id && !overwrites.some((o) => o.id === extraUserId)) {
    overwrites.push({
      id: extraUserId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: panel.ticketCategoryId || undefined,
    permissionOverwrites: overwrites,
  });

  const ticket = (
    await api.post("/api/tickets/bot", {
      guildId: guild.id,
      panelId: panel.id,
      channelId: channel.id,
      openerId: openerUser.id,
      openerUsername: openerUser.username,
    })
  ).data;

  const branding = guildData.branding || {};
  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`Ticket #${ticket.number}`)
    .setDescription(branding.welcomeMessage || "Thanks for reaching out! Support will be with you shortly.")
    .setColor(branding.primaryColor || panel.embedColor)
    .setFooter({ text: branding.footerText || "Powered by Ticket Zick" });

  // Pre-ticket question answers, shown as clearly labeled fields right in the
  // opening message so staff see them the moment they open the channel.
  if (answers && answers.length) {
    for (const a of answers) {
      welcomeEmbed.addFields({
        name: a.label.slice(0, 256),
        value: (a.value?.trim() || "*No answer provided*").slice(0, 1024),
      });
    }
  }

  // Staff always get channel access (handled above in the overwrites) — this only
  // controls whether they also get an actual @-mention. "Roles to ping" (the extra
  // list) always pings regardless of this toggle, and never double-pings a role
  // that's in both lists.
  const rolesToPing = [...new Set([...(panel.tagStaffOnOpen !== false ? staffRoleIds : []), ...pingRoleIds])];
  const pingText = rolesToPing.length ? rolesToPing.map((id) => `<@&${id}>`).join(" ") : "";
  const extraMention = extraUserId && extraUserId !== openerUser.id ? `<@${extraUserId}>` : "";

  await channel.send({
    content: `<@${openerUser.id}> ${extraMention} ${pingText}`.replace(/\s+/g, " ").trim(),
    embeds: [welcomeEmbed],
    components: buildTicketActionRows(),
  });

  return { channel, ticket };
}
