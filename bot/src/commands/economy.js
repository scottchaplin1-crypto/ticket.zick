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

    const buyable = items.filter((i) => i.acquisitionType !== "earn");
    const earnOnly = items.filter((i) => i.acquisitionType === "earn");

    const embed = new EmbedBuilder().setColor(0x5865f2);

    if (buyable.length) {
      embed.setTitle(`🛒 Store — priced in ${config.currencyName}`).setDescription(
        buyable
          .map((i) => {
            const tag = i.isMysteryBox ? " 🎰 *(mystery box — random prize!)*" : i.limited ? " *(one per person)*" : "";
            return `${displayEmoji(i.emoji)} **${i.name}** — ${i.price} ${config.currencyName}${tag}\n${i.description || ""}`;
          })
          .join("\n\n")
      );
    }

    if (earnOnly.length) {
      const label = { message: "messages sent", reaction: "reactions added", thread: "threads created", gif: "GIFs sent" };
      embed.addFields({
        name: "🔒 Earn these by being active",
        value: earnOnly
          .map((i) => `${displayEmoji(i.emoji)} **${i.name}** — ${i.earnThreshold} ${label[i.earnActivityType] || i.earnActivityType}\n${i.description || ""}`)
          .join("\n\n"),
      });
    }

    embed.setFooter({ text: buyable.length ? "Use /buy to purchase one" : "Keep chatting to earn these!" });
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("store command failed:", err.response?.data || err.message);
    await interaction.editReply("Couldn't load the store right now.");
  }
}

// Discord asks for live suggestions as someone types the item name — this
// responds with up to 25 matching item names from the store. Earn-only items
// don't show up here at all, since they can't be bought.
export async function handleBuyAutocomplete(interaction) {
  try {
    const [{ data: items }, { data: config }] = await Promise.all([
      api.get(`/api/economy/bot/${interaction.guildId}/items`),
      api.get(`/api/economy/bot/${interaction.guildId}/config`),
    ]);

    // Autocomplete choices are plain text — a custom server emoji can't render
    // as an image there, so fall back to just the currency name for those.
    const isCustom = /^[\w~]+:\d{15,21}$/.test(config?.currencyEmoji || "");
    const currencyLabel = isCustom ? config?.currencyName || "" : `${config?.currencyEmoji || ""} ${config?.currencyName || ""}`.trim();

    const focused = interaction.options.getFocused().toLowerCase();
    const matches = items
      .filter((i) => i.acquisitionType !== "earn" && i.name.toLowerCase().includes(focused))
      .slice(0, 25)
      .map((i) => ({ name: `${i.isMysteryBox ? "🎰 " : ""}${i.name} — ${i.price} ${currencyLabel}`.trim(), value: i.id }));
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

    // A little suspense for anything that might be a mystery box — since we
    // don't know yet whether it is one until the purchase actually resolves,
    // this only shows if the purchase succeeds and turns out to be a box.
    const { data: result } = await api.post(`/api/economy/bot/${interaction.guildId}/purchase`, {
      userId: interaction.user.id,
      itemId,
    });

    if (result.wonFromMysteryBox) {
      await interaction.editReply("🎰 Rolling the mystery box...");
      await new Promise((resolve) => setTimeout(resolve, 1800));
    }

    if (result.item.roleId) {
      try {
        await interaction.member.roles.add(result.item.roleId);
      } catch (err) {
        console.error("Failed to grant purchase role:", err.code || err.message);
      }
    }

    await interaction.editReply(
      result.wonFromMysteryBox
        ? `🎰 The box opens... ${displayEmoji(result.item.emoji)} **${result.item.name}**! (${result.newBalance} ${config.currencyName} left)`
        : `${displayEmoji(result.item.emoji)} Bought **${result.item.name}**! You have ${result.newBalance} ${config.currencyName} left.`
    );

    if (result.collectionLogChannelId) {
      const channel = await interaction.guild.channels.fetch(result.collectionLogChannelId).catch(() => null);
      if (channel) {
        const embed = result.isFirstTime
          ? new EmbedBuilder()
              .setAuthor({ name: "COLLECTION LOG" })
              .setDescription(`<@${interaction.user.id}> unlocked **${displayEmoji(result.item.emoji)} ${result.item.name}**!`)
              .setColor(0xfee75c)
          : new EmbedBuilder()
              .setAuthor({ name: "RECEIVED LOOT" })
              .setDescription(`<@${interaction.user.id}> got **${displayEmoji(result.item.emoji)} ${result.item.name}**.`)
              .setColor(0x5865f2);
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
    }
  } catch (err) {
    const message = err.response?.data?.error || "Couldn't complete that purchase.";
    await interaction.editReply(message);
  }
}

export async function handleWork(interaction) {
  await interaction.deferReply();
  try {
    const { data: config } = await api.get(`/api/economy/bot/${interaction.guildId}/config`);
    const { data: result } = await api.post(`/api/economy/bot/${interaction.guildId}/work`, { userId: interaction.user.id });

    if (result.item) {
      if (result.item.roleId) {
        try {
          await interaction.member.roles.add(result.item.roleId);
        } catch (err) {
          console.error("Failed to grant work item role:", err.code || err.message);
        }
      }
      await interaction.editReply(`💼 You worked hard and found... ${displayEmoji(result.item.emoji)} **${result.item.name}**!`);

      if (result.collectionLogChannelId) {
        const channel = await interaction.guild.channels.fetch(result.collectionLogChannelId).catch(() => null);
        if (channel) {
          const embed = result.isFirstTime
            ? new EmbedBuilder().setAuthor({ name: "COLLECTION LOG" }).setDescription(`<@${interaction.user.id}> unlocked **${displayEmoji(result.item.emoji)} ${result.item.name}**!`).setColor(0xfee75c)
            : new EmbedBuilder().setAuthor({ name: "RECEIVED LOOT" }).setDescription(`<@${interaction.user.id}> got **${displayEmoji(result.item.emoji)} ${result.item.name}**.`).setColor(0x5865f2);
          await channel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    } else if (result.currencyAmount > 0) {
      await interaction.editReply(`💼 You worked hard and earned **${result.currencyAmount} ${config?.currencyName || "currency"}**! (${result.newBalance} total)`);
    } else {
      await interaction.editReply(`💼 You worked hard but came up empty this time — ${result.label || "no luck"}.`);
    }
  } catch (err) {
    const message = err.response?.data?.error || "Couldn't work right now.";
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
