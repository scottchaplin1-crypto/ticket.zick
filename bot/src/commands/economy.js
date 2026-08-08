import { api } from "../utils/api.js";

// Only give-currency lives here now — the casual player-facing commands
// (!balance, !store, !buy, !work) moved to bot/src/handlers/economyPrefix.js
// as prefix commands instead of slash commands.

export async function handleGiveCurrency(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const user = interaction.options.getUser("user");
  const amount = interaction.options.getInteger("amount");

  try {
    const { data: config } = await api.get(`/api/economy/bot/${interaction.guildId}/config`);
    if (!config?.enabled) {
      return interaction.editReply("The economy isn't set up on this server yet.");
    }
    const { data: result } = await api.post(`/api/economy/bot/${interaction.guildId}/balance/${user.id}/add`, { amount });
    await interaction.editReply(
      `${amount >= 0 ? "Gave" : "Removed"} ${Math.abs(amount)} ${config?.currencyName || "currency"} ${amount >= 0 ? "to" : "from"} <@${user.id}> — new balance: ${result.balance}.`
    );
  } catch (err) {
    console.error("give-currency failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't update that balance right now.");
  }
}
