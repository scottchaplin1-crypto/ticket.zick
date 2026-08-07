import { Events } from "discord.js";
import { handlePanelSend } from "../commands/panelSend.js";
import { handleClaim, handleUnclaim, handleAdd, handleRemove, handleClose, handleAddViaSelect } from "../commands/ticketActions.js";
import { handleTicketOpenButton, handleTicketQuestionsSubmit } from "./ticketOpen.js";
import { handleOsrsLinkButton, handleOsrsLinkSubmit } from "./osrsLink.js";
import { handleBan, handleKick } from "../commands/moderation.js";
import { handleBalance, handleStore, handleBuy, handleBuyAutocomplete, handleGiveCurrency } from "../commands/economy.js";
import { handleStickerButton } from "./memberEvents.js";

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
          case "balance": return handleBalance(interaction);
          case "store": return handleStore(interaction);
          case "buy": return handleBuy(interaction);
          case "give-currency": return handleGiveCurrency(interaction);
        }
      }

      if (interaction.isAutocomplete()) {
        if (interaction.commandName === "buy") return handleBuyAutocomplete(interaction);
        return;
      }

      if (interaction.isButton()) {
        if (interaction.customId.startsWith("tz_open:")) return handleTicketOpenButton(interaction);
        if (interaction.customId === "tz_claim") return handleClaim(interaction);
        if (interaction.customId === "tz_close") return handleClose(interaction);
        if (interaction.customId === "tz_osrs_link") return handleOsrsLinkButton(interaction);
        if (interaction.customId.startsWith("tz_sticker:")) return handleStickerButton(interaction);
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
