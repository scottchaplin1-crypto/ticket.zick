import { PermissionFlagsBits } from "discord.js";
import { api } from "../utils/api.js";
import { createTicketChannel } from "../utils/createTicket.js";

// Lets staff type e.g. "$new @user" in any channel to open a ticket for that person,
// instead of using the panel button. The trigger word and target panel are both set
// per-guild from the dashboard's Quick Commands page.
//
// Note: pre-ticket questions (the modal/popup form) only apply to the panel button —
// Discord doesn't support popping a form from a plain text message, so quick-added
// tickets always skip straight to creating the channel.
export async function handleMessageCreate(message) {
  if (message.author.bot || !message.guild || !message.member) return;

  let guildData;
  try {
    const { data } = await api.get(`/api/customization/bot/${message.guild.id}/full`);
    guildData = data;
  } catch {
    return; // guild not set up in Ticket Zick yet, or backend unreachable — stay silent
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

    const { channel } = await createTicketChannel({
      guild: message.guild,
      client: message.client,
      panel,
      guildData,
      openerUser: targetUser,
      extraUserId: message.author.id, // whoever ran the command, in case they aren't already in a staff role
    });

    const confirmation = await message.reply(`Created ${channel} for ${targetUser}.`);
    setTimeout(() => confirmation.delete().catch(() => {}), 8000);
    await message.delete().catch(() => {}); // tidy up the "$new @user" message itself, best-effort
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
