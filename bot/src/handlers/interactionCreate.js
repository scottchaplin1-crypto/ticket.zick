import { Events } from "discord.js";
import { handlePanelSend } from "../commands/panelSend.js";
import { handleClaim, handleUnclaim, handleAdd, handleRemove, handleClose, handleAddViaSelect } from "../commands/ticketActions.js";
import { handleTicketOpenButton, handleTicketQuestionsSubmit } from "./ticketOpen.js";
import { handleOsrsLinkButton, handleOsrsLinkSubmit } from "./osrsLink.js";
import { handleBan, handleKick } from "../commands/moderation.js";
import { handleGiveCurrency } from "../commands/economy.js";
import { handleGiveawayStart, handleGiveawayEnd, handleGiveawayEntryButton } from "../commands/giveaways.js";
import { handlePollCreate, handlePollEnd, handlePollVoteButton } from "../commands/polls.js";

export function registerInteractionHandler(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        switch (interaction.commandName) {
          case "panel-send": return handlePanelSend(interaction);
          case "claim": return handleClaim(interaction);
          case "unclaim": return handleUnclaim(interaction);
          case "add": return handleAdd(interaction);
          case "remove": return handleRemove(interaction);
          case "close": return handleClose(interaction);
          case "ban": return handleBan(interaction);
          case "kick": return handleKick(interaction);
          case "give-currency": return handleGiveCurrency(interaction);
          case "giveaway":
            if (interaction.options.getSubcommand() === "start") return handleGiveawayStart(interaction);
            if (interaction.options.getSubcommand() === "end") return handleGiveawayEnd(interaction);
            break;
          case "poll":
            if (interaction.options.getSubcommand() === "create") return handlePollCreate(interaction);
            if (interaction.options.getSubcommand() === "end") return handlePollEnd(interaction);
            break;
        }
      }

      // No commands currently use autocomplete (buy moved to a !prefix command),
      // but this guard stays in case a future one does.
      if (interaction.isAutocomplete()) return;

      if (interaction.isButton()) {
        if (interaction.customId.startsWith("tz_open:")) return handleTicketOpenButton(interaction);
        if (interaction.customId === "tz_claim") return handleClaim(interaction);
        if (interaction.customId === "tz_close") return handleClose(interaction);
        if (interaction.customId === "tz_osrs_link") return handleOsrsLinkButton(interaction);
        if (interaction.customId.startsWith("tz_giveaway:")) return handleGiveawayEntryButton(interaction);
        if (interaction.customId.startsWith("tz_poll:")) return handlePollVoteButton(interaction);
      }

      if (interaction.isUserSelectMenu() && interaction.customId === "tz_adduser") {
        return handleAddViaSelect(interaction);
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith("tz_ticket_modal:")) return handleTicketQuestionsSubmit(interaction);
        if (interaction.customId === "tz_osrs_link_modal") return handleOsrsLinkSubmit(interaction);
      }
    } catch (err) {
      console.error("Interaction error:", err.response?.data || err.message || err);
      // Autocomplete interactions can't be replied to the normal way — trying
      // would just throw a second error, so just let it fail silently (Discord
      // shows an empty suggestion list, which is a reasonable fallback).
      if (interaction.isAutocomplete()) return;
      const payload = { content: "Something went wrong. Please try again or contact an admin.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}
