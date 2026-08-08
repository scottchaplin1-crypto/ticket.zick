import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

// The casual, frequently-used economy commands (!balance, !store, !buy, !work)
// are kept as classic prefix commands rather than slash commands — snappier for
// repeated use, and matches how most economy bots feel. Staff-only management
// (/give-currency) stays a proper slash command instead, restricted by Discord's
// own permission system.

function displayEmoji(value) {
  const customMatch = (value || "").match(/^([\w~]+):(\d{15,21})$/);
  return customMatch ? `<:${customMatch[1]}:${customMatch[2]}>` : value || "🪙";
}

export async function tryHandleEconomyPrefix(message) {
  if (message.author.bot || !message.guild) return false;
  const content = message.content.trim();
  if (!content.startsWith("!")) return false;

  const [rawCommand, ...args] = content.slice(1).split(/\s+/);
  const command = rawCommand.toLowerCase();

  if (command === "balance") {
    await handleBalance(message);
    return true;
  }
  if (command === "store") {
    await handleStore(message);
    return true;
  }
  if (command === "buy") {
    await handleBuy(message, args.join(" "));
    return true;
  }
  if (command === "work") {
    await handleWork(message);
    return true;
  }
  return false;
}

async function grantRoleIfAny(message, roleId) {
  if (!roleId) return;
  try {
    const member = await message.guild.members.fetch(message.author.id);
    await member.roles.add(roleId);
  } catch (err) {
    console.error("Failed to grant item role:", err.code || err.message);
  }
}

async function postCollectionLog(message, channelId, isFirstTime, item) {
  if (!channelId) return;
  const channel = await message.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;
  const embed = isFirstTime
    ? new EmbedBuilder().setAuthor({ name: "COLLECTION LOG" }).setDescription(`<@${message.author.id}> unlocked **${displayEmoji(item.emoji)} ${item.name}**!`).setColor(0xfee75c)
    : new EmbedBuilder().setAuthor({ name: "RECEIVED LOOT" }).setDescription(`<@${message.author.id}> got **${displayEmoji(item.emoji)} ${item.name}**.`).setColor(0x5865f2);
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function handleBalance(message) {
  try {
    const [{ data: config }, { data: balanceData }] = await Promise.all([
      api.get(`/api/economy/bot/${message.guild.id}/config`),
      api.get(`/api/economy/bot/${message.guild.id}/balance/${message.author.id}`),
    ]);
    if (!config?.enabled) return message.reply("The economy isn't set up on this server yet.");
    await message.reply(`${displayEmoji(config.currencyEmoji)} You have **${balanceData.balance} ${config.currencyName}**.`);
  } catch (err) {
    console.error("!balance failed:", err.response?.data || err.message);
    await message.reply("Couldn't check your balance right now.");
  }
}

async function handleStore(message) {
  try {
    const [{ data: config }, { data: items }] = await Promise.all([
      api.get(`/api/economy/bot/${message.guild.id}/config`),
      api.get(`/api/economy/bot/${message.guild.id}/items`),
    ]);
    if (!config?.enabled) return message.reply("The economy isn't set up on this server yet.");
    if (items.length === 0) return message.reply("The store's empty right now — check back later!");

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
    embed.setFooter({ text: buyable.length ? "Use !buy <item name> to purchase one" : "Keep chatting to earn these!" });
    await message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("!store failed:", err.response?.data || err.message);
    await message.reply("Couldn't load the store right now.");
  }
}

async function handleBuy(message, itemQuery) {
  if (!itemQuery) return message.reply("Tell me what to buy — e.g. `!buy topaz`. Check `!store` for names.");
  try {
    const [{ data: config }, { data: items }] = await Promise.all([
      api.get(`/api/economy/bot/${message.guild.id}/config`),
      api.get(`/api/economy/bot/${message.guild.id}/items`),
    ]);
    if (!config?.enabled) return message.reply("The economy isn't set up on this server yet.");

    const buyable = items.filter((i) => i.acquisitionType !== "earn");
    const query = itemQuery.toLowerCase();
    const exact = buyable.find((i) => i.name.toLowerCase() === query);
    const matches = exact ? [exact] : buyable.filter((i) => i.name.toLowerCase().includes(query));

    if (matches.length === 0) return message.reply(`Couldn't find a buyable item called "${itemQuery}" — check \`!store\`.`);
    if (matches.length > 1) return message.reply(`That matches more than one item (${matches.map((m) => m.name).join(", ")}) — be more specific.`);

    const item = matches[0];
    const { data: result } = await api.post(`/api/economy/bot/${message.guild.id}/purchase`, { userId: message.author.id, itemId: item.id });

    if (result.wonFromMysteryBox) {
      const sent = await message.reply("🎰 Rolling the mystery box...");
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await grantRoleIfAny(message, result.item.roleId);
      await sent.edit(`🎰 The box opens... ${displayEmoji(result.item.emoji)} **${result.item.name}**! (${result.newBalance} ${config.currencyName} left)`);
    } else {
      await grantRoleIfAny(message, result.item.roleId);
      await message.reply(`${displayEmoji(result.item.emoji)} Bought **${result.item.name}**! You have ${result.newBalance} ${config.currencyName} left.`);
    }

    await postCollectionLog(message, result.collectionLogChannelId, result.isFirstTime, result.item);
  } catch (err) {
    await message.reply(err.response?.data?.error || "Couldn't complete that purchase.");
  }
}

async function handleWork(message) {
  try {
    const { data: config } = await api.get(`/api/economy/bot/${message.guild.id}/config`);
    const { data: result } = await api.post(`/api/economy/bot/${message.guild.id}/work`, { userId: message.author.id });

    if (result.item) {
      await grantRoleIfAny(message, result.item.roleId);
      await message.reply(`🍀 **RARE FIND!** 💼 You worked hard and found... ${displayEmoji(result.item.emoji)} **${result.item.name}**!`);
      await postCollectionLog(message, result.collectionLogChannelId, result.isFirstTime, result.item);
    } else if (result.rare) {
      await message.reply(`🍀 **RARE FIND!** 💼 You worked hard and earned a bonus **${result.currencyAmount} ${config?.currencyName || "currency"}**! (${result.newBalance} total)`);
    } else {
      await message.reply(`💼 You worked hard and earned **${result.currencyAmount} ${config?.currencyName || "currency"}**! (${result.newBalance} total)`);
    }
  } catch (err) {
    await message.reply(err.response?.data?.error || "Couldn't work right now.");
  }
}
