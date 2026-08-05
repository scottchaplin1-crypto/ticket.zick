import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import { api } from "../utils/api.js";
import { createTicketChannel } from "../utils/createTicket.js";

// Clicking "Open Ticket": if the panel has questions configured, show a Discord
// modal (popup form) first and create the ticket once it's submitted (see
// handleTicketQuestionsSubmit below). Otherwise create the ticket immediately.
export async function handleTicketOpenButton(interaction) {
  const panelId = interaction.customId.split(":")[1];

  let panel;
  try {
    const { data } = await api.get(`/api/panels/bot/${panelId}`);
    panel = data;
  } catch (err) {
    console.error("ticket-open: failed to load panel:", err.code || err.message);
    return interaction.reply({ content: "Couldn't load this panel — please try again in a moment.", ephemeral: true });
  }

  let questions = [];
  try {
    questions = JSON.parse(panel.questions || "[]");
  } catch {
    questions = [];
  }

  if (panel.questionsEnabled && questions.length > 0) {
    const modal = new ModalBuilder()
      .setCustomId(`tz_ticket_modal:${panel.id}`)
      .setTitle((panel.embedTitle || "Open a ticket").slice(0, 45));

    for (const q of questions.slice(0, 5)) {
      const input = new TextInputBuilder()
        .setCustomId(q.id)
        .setLabel((q.label || "Question").slice(0, 45))
        .setStyle(q.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(q.required !== false);
      if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100));
      modal.addComponents(new ActionRowBuilder().addComponents(input));
    }

    return interaction.showModal(modal);
  }

  await interaction.deferReply({ ephemeral: true });
  try {
    await openTicketForUser(interaction, panel);
  } catch (err) {
    console.error("ticket-open failed:", err.code || err.message);
    await interaction.editReply({ content: friendlyCreateError(err) });
  }
}

// The modal's "Submit" button lands here with the answers filled in.
export async function handleTicketQuestionsSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const panelId = interaction.customId.split(":")[1];

  try {
    const { data: panel } = await api.get(`/api/panels/bot/${panelId}`);
    const questions = JSON.parse(panel.questions || "[]");
    const answers = questions.map((q) => ({
      label: q.label,
      value: interaction.fields.getTextInputValue(q.id),
    }));
    await openTicketForUser(interaction, panel, answers);
  } catch (err) {
    console.error("ticket-questions-submit failed:", err.code || err.message);
    await interaction.editReply({ content: friendlyCreateError(err) });
  }
}

async function openTicketForUser(interaction, panel, answers) {
  const { data: openCheck } = await api.get("/api/tickets/bot/open-count", {
    params: { panelId: panel.id, openerId: interaction.user.id },
  });
  if (openCheck.count >= panel.maxOpenPerUser) {
    return interaction.editReply({
      content: `You already have ${openCheck.count} open ticket(s) for this panel (max ${panel.maxOpenPerUser}).`,
    });
  }

  const { data: guildData } = await api.get(`/api/customization/bot/${interaction.guildId}/full`);

  const { channel } = await createTicketChannel({
    guild: interaction.guild,
    client: interaction.client,
    panel,
    guildData,
    openerUser: interaction.user,
    answers,
  });

  await interaction.editReply({ content: `Your ticket has been created: ${channel}` });
}

function friendlyCreateError(err) {
  if (err.code === 50013) {
    return "I don't have permission to create a channel here. In Discord, check Server Settings → Roles → Ticket Zick, and make sure **Manage Channels** is enabled — also check the ticket category (if you set one) allows the Ticket Zick role to manage/view it.";
  }
  return "Something went wrong creating your ticket. Check the bot's logs for details.";
}
