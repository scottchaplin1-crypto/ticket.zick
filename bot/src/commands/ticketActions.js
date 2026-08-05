import { PermissionFlagsBits, AttachmentBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { buildTranscriptHtml } from "../utils/transcript.js";

// Every handler defers first (before any backend call) so Discord doesn't time out
// waiting on a slow/sleeping Render service, and wraps everything in try/catch so a
// failure gives a clear message instead of leaving the interaction stuck "thinking".

async function getTicketForChannel(channelId) {
  const { data } = await api.get(`/api/tickets/bot/by-channel/${channelId}`);
  return data;
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

    await interaction.editReply("🔒 Closing this ticket and generating a transcript...");

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const html = buildTranscriptHtml(interaction.channel.name, [...messages.values()]);

    const attachment = new AttachmentBuilder(Buffer.from(html, "utf-8"), {
      name: `${interaction.channel.name}-transcript.html`,
    });

    // Send transcript to the ticket opener via DM, best-effort
    try {
      const opener = await interaction.client.users.fetch(ticket.openerId);
      await opener.send({
        content: `Your ticket in **${interaction.guild.name}** has been closed. Transcript attached.`,
        files: [attachment],
      });
    } catch {
      // opener has DMs closed — no big deal
    }

    await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "closed" });

    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
  } catch (err) {
    console.error("close failed:", err.code || err.message);
    await interaction.editReply(friendlyError(err)).catch(() => {});
  }
}
