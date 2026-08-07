import { EmbedBuilder } from "discord.js";
import { api } from "../utils/api.js";

// Called whenever the bot observes a trackable action. Reports it to the server,
// which does the actual "did this cross a tier" logic and hands back anything
// newly unlocked, which we then announce and grant the role for.
export async function trackStat(guild, memberId, statType, amount = 1) {
  try {
    const { data } = await api.post("/api/achievements/bot/increment", {
      guildId: guild.id,
      userId: memberId,
      statType,
      amount,
    });
    for (const unlock of data.unlocked || []) {
      await announceUnlock(guild, memberId, unlock);
    }
  } catch (err) {
    console.error("achievement tracking failed:", err.code || err.message);
  }
}

async function announceUnlock(guild, memberId, unlock) {
  if (unlock.roleId) {
    try {
      const member = await guild.members.fetch(memberId);
      await member.roles.add(unlock.roleId);
    } catch (err) {
      console.error("Failed to grant achievement role:", err.code || err.message);
    }
  }

  if (!unlock.announceChannelId) return; // no channel configured — grant the role, but skip announcing
  const channel = await guild.channels.fetch(unlock.announceChannelId).catch(() => null);
  if (!channel) return;

  const tierLabel = unlock.tier.charAt(0).toUpperCase() + unlock.tier.slice(1);

  // A "placard" styled with a Discord embed — colored border, small-caps header,
  // big title, description, tier — rather than a custom-rendered image. Gets most
  // of the visual punch of a real graphic badge without needing image-generation
  // infrastructure.
  const placard = new EmbedBuilder()
    .setAuthor({ name: "ACHIEVEMENT UNLOCKED" })
    .setTitle(`${unlock.emoji} ${unlock.achievementName}`)
    .setColor(parseInt((unlock.color || "#FEE75C").replace("#", ""), 16) || 0xfee75c)
    .setFooter({ text: `${tierLabel} tier` });
  if (unlock.description) placard.setDescription(unlock.description);

  await channel
    .send({
      content: `GG <@${memberId}>, you just unlocked the achievement: **${unlock.achievementName} (${tierLabel})**! 🎉`,
      embeds: [placard],
    })
    .catch(() => {});
}
