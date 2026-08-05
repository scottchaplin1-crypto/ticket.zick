import { Events } from "discord.js";
import { handlePanelSend } from "../commands/panelSend.js";
import { handleClaim, handleUnclaim, handleAdd, handleRemove, handleClose } from "../commands/ticketActions.js";
import { handleTicketOpenButton } from "./ticketOpen.js";

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
        }
      }

      if (interaction.isButton() && interaction.customId.startsWith("tz_open:")) {
        return handleTicketOpenButton(interaction);
      }
    } catch (err) {
      console.error("Interaction error:", err.response?.data || err.message || err);
      const payload = { content: "Something went wrong. Please try again or contact an admin.", ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });
}
