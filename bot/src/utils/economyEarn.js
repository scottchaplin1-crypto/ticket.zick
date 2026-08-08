import { api } from "./api.js";
import { EmbedBuilder } from "discord.js";

// Called on every trackable action — the server decides whether this actually
// pays out (rule enabled? amount > 0? off cooldown?), so the bot doesn't need to
// know any of that itself. Also returns any "earn"-type items that just got
// automatically unlocked by this same action, which we announce here.
export async function tryEarn(guild, userId, type) {
  try {
    const { data } = await api.post(`/api/economy/bot/${guild.id}/earn`, { userId, type });
    if (data.unlocked?.length) {
      for (const item of data.unlocked) await announceEarnedItem(guild, userId, item);
    }
    return data;
  } catch (err) {
    console.error(`economy earn (${type}) failed:`, err.response?.data || err.message);
    return { earned: false };
  }
}

async function announceEarnedItem(guild, userId, item) {
  if (item.roleId) {
    try {
      const member = await guild.members.fetch(userId);
      await member.roles.add(item.roleId);
    } catch (err) {
      console.error("Failed to grant earned-item role:", err.code || err.message);
    }
  }
  if (!item.collectionLogChannelId) return;
  const channel = await guild.channels.fetch(item.collectionLogChannelId).catch(() => null);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setAuthor({ name: "COLLECTION LOG" })
    .setDescription(`<@${userId}> unlocked **${item.emoji} ${item.name}**!`)
    .setColor(0xfee75c);
  await channel.send({ embeds: [embed] }).catch(() => {});
}

// Basic GIF detection — covers an actual uploaded .gif file, Discord's native GIF
// picker (which posts a Tenor link), and Giphy links. Not exhaustive, but covers
// the overwhelming majority of how people actually send GIFs.
export function messageHasGif(message) {
  if (message.attachments?.some((a) => a.name?.toLowerCase().endsWith(".gif") || a.contentType === "image/gif")) return true;
  if (message.embeds?.some((e) => e.url?.includes("tenor.com") || e.url?.includes("giphy.com") || e.image?.url?.toLowerCase().endsWith(".gif"))) return true;
  if (/\b(tenor\.com|giphy\.com)\b/i.test(message.content || "")) return true;
  return false;
}
