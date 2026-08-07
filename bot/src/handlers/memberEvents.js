import { EmbedBuilder, AttachmentBuilder } from "discord.js";
import { api } from "../utils/api.js";

function fillPlaceholders(template, member) {
  return template
    .replaceAll("{user}", `<@${member.id}>`)
    .replaceAll("{username}", member.user?.username || member.displayName || "Someone")
    .replaceAll("{membercount}", String(member.guild.memberCount))
    .replaceAll("{server}", member.guild.name);
}

export async function handleMemberAdd(member) {
  const banned = await tryAutoBan(member).catch((err) => {
    console.error("auto-ban check failed:", err.code || err.message);
    return false;
  });
  if (banned) return; // don't also welcome/role someone we just banned

  let config;
  try {
    const res = await api.get(`/api/welcome/bot/${member.guild.id}`);
    config = res.data;
  } catch (err) {
    console.error("Couldn't load welcome config:", err.code || err.message);
    return;
  }
  if (!config) return;

  // Independent of the welcome message toggle — someone might want the role
  // without any message posting at all, or vice versa.
  if (config.autoRoleEnabled) {
    try {
      const autoRoleIds = JSON.parse(config.autoRoleIds || "[]");
      if (autoRoleIds.length) await member.roles.add(autoRoleIds);
    } catch (err) {
      console.error("Failed to apply auto-role(s):", err.code || err.message);
    }
  }

  try {
    if (!config.welcomeEnabled || !config.welcomeChannelId) return;

    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (!channel) return;

    const stickerButton = config.stickerButtonEnabled
      ? [
          {
            type: 1,
            components: [{ type: 2, style: 2, custom_id: `tz_sticker:${member.id}`, label: "Send a welcome sticker!", emoji: { name: "🎉" } }],
          },
        ]
      : undefined;

    if (config.bannerEnabled) {
      const banner = await tryGenerateBanner(member, config).catch((err) => {
        console.error("welcome banner generation failed, falling back to plain message:", err.message);
        return null;
      });
      if (banner) {
        await channel.send({
          content: `<@${member.id}> ${fillPlaceholders(config.welcomeMessage, member)}`,
          files: [banner],
          components: stickerButton,
        });
        return;
      }
      // Falls through to the plain embed below if banner generation failed —
      // better to still welcome them than to silently post nothing.
    }

    await channel.send({
      embeds: [new EmbedBuilder().setDescription(fillPlaceholders(config.welcomeMessage, member)).setColor(0x23a55a)],
      components: stickerButton,
    });
  } catch (err) {
    console.error("welcome message failed:", err.code || err.message);
  }
}

// Checked on every join, before anything else. Only ever affects new joins — never
// retroactively sweeps existing members, same as how Dyno's equivalent feature works.
async function tryAutoBan(member) {
  const { data: modConfig } = await api.get(`/api/moderation/bot/${member.guild.id}`);
  if (!modConfig?.autoBanEnabled) return false;

  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  if (accountAgeDays >= modConfig.autoBanMinAgeDays) return false;

  const reason = `Auto-banned: account is ${Math.floor(accountAgeDays)} day(s) old, minimum is ${modConfig.autoBanMinAgeDays}`;
  await member.ban({ reason });

  await api.post(`/api/moderation/bot/${member.guild.id}/log-case`, {
    action: "autoban",
    targetId: member.id,
    targetTag: member.user.tag,
    moderatorId: null,
    reason,
  });

  if (modConfig.modLogChannelId) {
    const channel = await member.guild.channels.fetch(modConfig.modLogChannelId).catch(() => null);
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Auto-Banned — account too new")
        .addFields({ name: "User", value: `${member.user.tag} (${member.id})` }, { name: "Reason", value: reason })
        .setColor(0xda373c)
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  return true;
}

async function tryGenerateBanner(member, config) {
  const title = fillPlaceholders(config.bannerTitleTemplate, member);
  const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });

  const response = await api.get(`/api/welcome/bot/${member.guild.id}/banner`, {
    params: {
      backgroundUrl: config.bannerImageUrl || undefined,
      backgroundColor: config.bannerBackgroundColor,
      textColor: config.bannerTextColor,
      accentColor: config.bannerAccentColor,
      overlayOpacity: config.bannerOverlayOpacity,
      avatarUrl,
      title,
      memberCount: member.guild.memberCount,
    },
    responseType: "arraybuffer",
  });

  return new AttachmentBuilder(Buffer.from(response.data), { name: "welcome.png" });
}

// Any member (not just the person who joined) can click this to post a real
// Discord sticker publicly, welcoming the new joiner. The joiner's ID is encoded
// right in the button's custom_id, since a click could happen long after the bot
// last had this in memory (even after a restart).
export async function handleStickerButton(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const joinerId = interaction.customId.split(":")[1];

  try {
    const stickers = await interaction.guild.stickers.fetch();
    if (stickers.size === 0) {
      return interaction.editReply(
        "This server doesn't have any custom stickers yet — upload some under Server Settings → Emoji & Stickers first, then this button will have something to send!"
      );
    }

    const sticker = stickers.random();
    await interaction.channel.send({
      content: `🎉 <@${interaction.user.id}> sent <@${joinerId}> a welcome sticker!`,
      stickers: [sticker.id],
    });
    await interaction.editReply("Sticker sent! 🎉");
  } catch (err) {
    console.error("sticker button failed:", err.code || err.message);
    await interaction.editReply("Couldn't send a sticker — make sure the bot can send messages in this channel.");
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
