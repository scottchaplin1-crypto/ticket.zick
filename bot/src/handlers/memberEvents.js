import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

function fillPlaceholders(template, member) {
  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user?.username || member.displayName || "Someone")
    .replaceAll("{membercount}", String(member.guild.memberCount))
    .replaceAll("{server}", member.guild.name);
}

export async function handleMemberAdd(member) {
  try {
    const { data: config } = await api.get(`/api/welcome/bot/${member.guild.id}`);
    if (!config?.welcomeEnabled || !config.welcomeChannelId) return;

    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!channel) return;

    await channel.send({
      embeds: [new EmbedBuilder().setDescription(fillPlaceholders(config.welcomeMessage, member)).setColor(0x23a55a)],
    });
  } catch (err) {
    console.error("welcome message failed:", err.code || err.message);
  }
}

export async function handleMemberRemove(member) {
  try {
    const { data: config } = await api.get(`/api/welcome/bot/${member.guild.id}`);
    if (!config?.goodbyeEnabled || !config.goodbyeChannelId) return;

    const channel = await member.guild.channels.fetch(config.goodbyeChannelId).catch(() => null);
    if (!channel) return;

    await channel.send({
      embeds: [new EmbedBuilder().setDescription(fillPlaceholders(config.goodbyeMessage, member)).setColor(0xda373c)],
    });
  } catch (err) {
    console.error("goodbye message failed:", err.code || err.message);
  }
}
