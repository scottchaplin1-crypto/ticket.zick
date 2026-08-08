import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

// Checks a message against the guild's configured custom commands and posts the
// matching embed if there's an exact match. Returns true if it handled the
// message, so the caller knows not to also treat it as something else.
export async function tryHandleCustomCommand(message) {
  if (message.author.bot || !message.guild) return false;

  let guildData;
  try {
    const { data } = await api.get(`/api/customization/bot/${message.guild.id}/full`);
    guildData = data;
  } catch {
    return false;
  }

  const commands = guildData.customCommands || [];
  const content = message.content.trim().toLowerCase();
  const command = commands.find((c) => c.trigger.toLowerCase() === content);
  if (!command) return false;

  const embed = new EmbedBuilder().setColor(command.embedColor || "#5865F2");
  if (command.embedTitle) embed.setTitle(command.embedTitle);
  if (command.embedDescription) embed.setDescription(command.embedDescription);
  if (command.embedImageUrl) embed.setImage(command.embedImageUrl);
  if (command.embedThumbnailUrl) embed.setThumbnail(command.embedThumbnailUrl);

  try {
    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("custom command send failed:", err.code || err.message);
  }
  return true;
}
