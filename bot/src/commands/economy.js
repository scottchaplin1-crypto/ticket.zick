import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

// Displays a stored emoji value (plain unicode, or "name:id" for a custom server
// emoji) as actual Discord markup that renders correctly in a message.
function displayEmoji(value) {
  const customMatch = (value || "").match(/^([\w~]+):(\d{15,21})$/);
  return customMatch ? `<:${customMatch[1]}:${customMatch[2]}>` : value || "🪙";
}

export async function handleBalance(interaction) {
  await interaction.deferReply();
  try {
    const [{ data: config }, { data: balanceData }] = await Promise.all([
      api.get(`/api/economy/bot/${interaction.guildId}/config`),
      api.get(`/api/economy/bot/${interaction.guildId}/balance/${interaction.user.id}`),
    ]);

    if (!config?.enabled) {
      return interaction.editReply("The economy isn't set up on this server yet.");
    }

    await interaction.editReply(
      `${displayEmoji(config.currencyEmoji)} You have **${balanceData.balance} ${config.currencyName}**.`
    );
  } catch (err) {
    console.error("balance command failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't check your balance right now.");
  }
}

export async function handleStore(interaction) {
  await interaction.deferReply();
  try {
    const [{ data: config }, { data: items }] = await Promise.all([
      api.get(`/api/economy/bot/${interaction.guildId}/config`),
      api.get(`/api/economy/bot/${interaction.guildId}/items`),
    ]);

    if (!config?.enabled) {
      return interaction.editReply("The economy isn't set up on this server yet.");
    }
    if (items.length === 0) {
      return interaction.editReply("The store's empty right now — check back later!");
    }

    const embed = new EmbedBuilder()
      .setTitle(`🛒 Store — priced in ${config.currencyName}`)
      .setColor(0x5865f2)
      .setDescription(
        items
          .map((i) => `${displayEmoji(i.emoji)} **${i.name}** — ${i.price} ${config.currencyName}${i.limited ? " *(one per person)*" : ""}\n${i.description || ""}`)
          .join("\n\n")
      )
      .setFooter({ text: "Use /buy to purchase one" });

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("store command failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't load the store right now.");
  }
}

// Discord asks for live suggestions as someone types the item name — this
// responds with up to 25 matching item names from the store.
export async function handleBuyAutocomplete(interaction) {
  try {
    const { data: items } = await api.get(`/api/economy/bot/${interaction.guildId}/items`);
    const focused = interaction.options.getFocused().toLowerCase();
    const matches = items
      .filter((i) => i.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((i) => ({ name: `${i.name} — ${i.price}`, value: i.id }));
    await interaction.respond(matches);
  } catch {
    await interaction.respond([]).catch(() => {});
  }
}

export async function handleBuy(interaction) {
  await interaction.deferReply();
  const itemId = interaction.options.getString("item");

  try {
    const { data: config } = await api.get(`/api/economy/bot/${interaction.guildId}/config`);
    if (!config?.enabled) {
      return interaction.editReply("The economy isn't set up on this server yet.");
    }

    const { data: result } = await api.post(`/api/economy/bot/${interaction.guildId}/purchase`, {
      userId: interaction.user.id,
      itemId,
    });

    if (result.item.roleId) {
      try {
        await interaction.member.roles.add(result.item.roleId);
      } catch (err) {
        console.error("Failed to grant purchase role:", err.code || err.message);
      }
    }

    await interaction.editReply(
      `${displayEmoji(result.item.emoji)} Bought **${result.item.name}**! You have ${result.newBalance} ${config.currencyName} left.`
    );

    if (result.collectionLogChannelId) {
      const channel = await interaction.guild.channels.fetch(result.collectionLogChannelId).catch(() => null);
      if (channel) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: "COLLECTION LOG" })
          .setDescription(`<@${interaction.user.id}> unlocked **${displayEmoji(result.item.emoji)} ${result.item.name}**!`)
          .setColor(0xfee75c);
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (err) {
    const message = err.response?.data?.error || "Couldn't complete that purchase.";
    await interaction.editReply(message);
  }
}

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
