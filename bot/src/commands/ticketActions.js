import { PermissionFlagsBits, AttachmentBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { buildTranscriptHtml } from "../utils/transcript.js";

async function getTicketForChannel(channelId, interaction) {
  try {
    const { data } = await api.get(`/api/tickets/bot/by-channel/${channelId}`);
    return data;
  } catch {
    await interaction.reply({ content: "This isn't a ticket channel.", ephemeral: true });
    return null;
  }
}

export async function handleClaim(interaction) {
  const ticket = await getTicketForChannel(interaction.channel.id, interaction);
  if (!ticket) return;

  await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "claimed", claimedById: interaction.user.id });
  await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
  await interaction.reply(`🎟️ Ticket claimed by ${interaction.user}.`);
}

export async function handleUnclaim(interaction) {
  const ticket = await getTicketForChannel(interaction.channel.id, interaction);
  if (!ticket) return;

  await api.patch(`/api/tickets/bot/${ticket.id}`, { status: "open", claimedById: null });
  await interaction.reply(`Ticket unclaimed.`);
}

export async function handleAdd(interaction) {
  const ticket = await getTicketForChannel(interaction.channel.id, interaction);
  if (!ticket) return;
  const user = interaction.options.getUser("user");
  await interaction.channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await interaction.reply(`Added ${user} to the ticket.`);
}

export async function handleRemove(interaction) {
  const ticket = await getTicketForChannel(interaction.channel.id, interaction);
  if (!ticket) return;
  const user = interaction.options.getUser("user");
  await interaction.channel.permissionOverwrites.delete(user.id);
  await interaction.reply(`Removed ${user} from the ticket.`);
}

export async function handleClose(interaction) {
  if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
    const ticket = await getTicketForChannel(interaction.channel.id, interaction);
    if (!ticket || ticket.openerId !== interaction.user.id) {
      return interaction.reply({ content: "You don't have permission to close this ticket.", ephemeral: true });
    }
  }

  const ticket = await getTicketForChannel(interaction.channel.id, interaction);
  if (!ticket) return;

  await interaction.reply("🔒 Closing this ticket and generating a transcript...");

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
}
