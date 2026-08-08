import { PermissionFlagsBits, AttachmentBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { buildTranscriptHtml } from "../utils/transcript.js";
import { isStaffMember } from "../utils/permissions.js";

// Every handler defers first (before any backend call) so Discord doesn't time out
// waiting on a slow/sleeping Render service, and wraps everything in try/catch so a
// failure gives a clear message instead of leaving the interaction stuck "thinking".

async function getTicketForChannel(channelId) {
  const { data } = await api.get(`/api/tickets/bot/by-channel/${channelId}`);
  return data;
}

// Applies a panel's configured "roles on close" — e.g. removing a "Pending" role
// and adding a "Member" role, for an application-style panel where closing the
// ticket is effectively the approval. Runs regardless of transcript settings.
async function updateOpenerRolesOnClose(guild, ticket) {
  const closeAddRoleIds = JSON.parse(ticket.panel?.closeAddRoleIds || "[]");
  const closeRemoveRoleIds = JSON.parse(ticket.panel?.closeRemoveRoleIds || "[]");
  if (!closeAddRoleIds.length && !closeRemoveRoleIds.length) return;

  try {
    const openerMember = await guild.members.fetch(ticket.openerId);
    if (closeRemoveRoleIds.length) await openerMember.roles.remove(closeRemoveRoleIds);
    if (closeAddRoleIds.length) await openerMember.roles.add(closeAddRoleIds);
  } catch (err) {
    console.error("Failed to update opener roles on close:", err.code || err.message);
  }
}

function friendlyError(err) {
  if (err.code === 50013 || err.code === 50001) {
    return "I don't have permission to do that here. Check Server Settings → Roles → Ticket Zick has **Manage Channels**, and that the role can access this channel/category.";
  }
  return "Something went wrong. Check the bot's logs for details.";
}

export async function handleClaim(interaction) {
  await interaction.deferReply();
  try {
    let ticket;
    try {
      ticket = await getTicketForChannel(interaction.channel.id);
    } catch {
      return interaction.editReply("This isn't a ticket channel.");
    }

    await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "claimed", claimedById: interaction.user.id });
    await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
    await interaction.editReply(`🎟️ Ticket claimed by ${interaction.user}.`);
  } catch (err) {
    console.error("claim failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err));
  }
}

export async function handleUnclaim(interaction) {
  await interaction.deferReply();
  try {
    let ticket;
    try {
      ticket = await getTicketForChannel(interaction.channel.id);
    } catch {
      return interaction.editReply("This isn't a ticket channel.");
    }

    await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "open", claimedById: null });
    await interaction.editReply("Ticket unclaimed.");
  } catch (err) {
    console.error("unclaim failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err));
  }
}

export async function handleAdd(interaction) {
  await interaction.deferReply();
  try {
    try {
      await getTicketForChannel(interaction.channel.id);
    } catch {
      return interaction.editReply("This isn't a ticket channel.");
    }

    if (!(await isStaffMember(interaction.guildId, interaction.member))) {
      return interaction.editReply("Only staff can add people to a ticket.");
    }

    const user = interaction.options.getUser("user");
    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.editReply(`Added ${user} to the ticket.`);
  } catch (err) {
    console.error("add failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err));
  }
}

export async function handleRemove(interaction) {
  await interaction.deferReply();
  try {
    try {
      await getTicketForChannel(interaction.channel.id);
    } catch {
      return interaction.editReply("This isn't a ticket channel.");
    }

    const user = interaction.options.getUser("user");
    await interaction.channel.permissionOverwrites.delete(user.id);
    await interaction.editReply(`Removed ${user} from the ticket.`);
  } catch (err) {
    console.error("remove failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err));
  }
}

export async function handleAddViaSelect(interaction) {
  await interaction.deferReply();
  try {
    try {
      await getTicketForChannel(interaction.channel.id);
    } catch {
      return interaction.editReply("This isn't a ticket channel.");
    }

    if (!(await isStaffMember(interaction.guildId, interaction.member))) {
      return interaction.editReply("Only staff can add people to a ticket.");
    }

    const user = interaction.users.first();
    if (!user) return interaction.editReply("No user was selected.");

    await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    await interaction.editReply(`Added ${user} to the ticket.`);
  } catch (err) {
    console.error("add (select menu) failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err));
  }
}

export async function handleClose(interaction) {
  await interaction.deferReply();

  try {
    let ticket;
    try {
      ticket = await getTicketForChannel(interaction.channel.id);
    } catch {
      return interaction.editReply("This isn't a ticket channel.");
    }

    const canManage = interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);
    if (!canManage && ticket.openerId !== interaction.user.id) {
      return interaction.editReply("You don't have permission to close this ticket.");
    }

    await interaction.editReply("🔒 Closing this ticket...");

    await updateOpenerRolesOnClose(interaction.guild, ticket);

    if (!ticket.panel?.transcriptEnabled) {
      await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "closed" });
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
      return;
    }

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const html = buildTranscriptHtml(interaction.channel.name, [...messages.values()]);

    const destination = ticket.panel.transcriptDestination || "dm";
    const wantsDm = destination === "dm" || destination === "both";
    const wantsChannel = destination === "channel" || destination === "both";

    if (wantsDm) {
      try {
        const opener = await interaction.client.users.fetch(ticket.openerId);
        await opener.send({
          content: `Your ticket in **${interaction.guild.name}** has been closed. Transcript attached.`,
          files: [new AttachmentBuilder(Buffer.from(html, "utf-8"), { name: `${interaction.channel.name}-transcript.html` })],
        });
      } catch {
        // opener has DMs closed — no big deal, continue
      }
    }

    if (wantsChannel && ticket.panel.transcriptChannelId) {
      try {
        const transcriptChannel = await interaction.guild.channels.fetch(ticket.panel.transcriptChannelId);
        await transcriptChannel.send({
          content: `Transcript for ticket **#${ticket.number}** (${interaction.channel.name}), opened by <@${ticket.openerId}>.`,
          files: [new AttachmentBuilder(Buffer.from(html, "utf-8"), { name: `${interaction.channel.name}-transcript.html` })],
        });
      } catch (err) {
        console.error("Failed to post transcript to channel:", err.code || err.message);
      }
    }

    await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "closed" });

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error("close failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err)).catch(() => {});
  }
}
