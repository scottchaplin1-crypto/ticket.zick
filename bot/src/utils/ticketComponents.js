import { ActionRowBuilder, ButtonBuilder, ButtonStyle, UserSelectMenuBuilder } from "discord.js";

// The button/select row posted in every ticket's welcome message, so staff can
// claim/close/add people without typing slash commands. customIds are static
// (not per-ticket) because the handlers already figure out "which ticket" from
// the channel the interaction happened in.
export function buildTicketActionRows() {
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("tz_claim").setLabel("Claim").setEmoji("🎟️").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("tz_close").setLabel("Close").setEmoji("🔒").setStyle(ButtonStyle.Danger)
  );
  const selectRow = new ActionRowBuilder().addComponents(
    new UserSelectMenuBuilder().setCustomId("tz_adduser").setPlaceholder("Add a user to this ticket").setMinValues(1).setMaxValues(1)
  );
  return [buttonRow, selectRow];
}
