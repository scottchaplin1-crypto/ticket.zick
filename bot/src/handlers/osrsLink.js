import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";
import { api } from "../utils/api.js";

export async function handleOsrsLinkButton(interaction) {
  const modal = new ModalBuilder()
    .setCustomId("tz_osrs_link_modal")
    .setTitle("Link your OSRS account")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("rsn")
          .setLabel("Your in-game name (RSN)")
          .setPlaceholder("e.g. Zezima — capitals/spacing don't matter")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(12)
      )
    );
  await interaction.showModal(modal);
}

export async function handleOsrsLinkSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const rsn = interaction.fields.getTextInputValue("rsn");

  try {
    const { data } = await api.post("/api/osrs-sync/bot/link", {
      guildId: interaction.guildId,
      discordId: interaction.user.id,
      rsn,
    });
    await interaction.editReply(
      `Linked to **${data.rsn}**! Your rank in the clan is **${data.role}**${data.roleId ? " — role updated." : ", but no Discord role is mapped to that rank yet."}`
    );
  } catch (err) {
    const message = err.response?.data?.error || "Something went wrong linking your account. Try again in a moment.";
    await interaction.editReply(message);
  }
}
