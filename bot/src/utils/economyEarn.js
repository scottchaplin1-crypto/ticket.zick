import { api } from "./api.js";

// Called on every trackable action — the server decides whether this actually
// pays out (rule enabled? amount > 0? off cooldown?), so the bot doesn't need to
// know any of that itself.
export async function tryEarn(guildId, userId, type) {
  try {
    const { data } = await api.post(`/api/economy/bot/${guildId}/earn`, { userId, type });
    return data;
  } catch (err) {
    console.error(`economy earn (${type}) failed:`, err.response?.data || err.message);
    return { earned: false };
  }
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
