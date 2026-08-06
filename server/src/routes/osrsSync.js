import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";
import { fetchGroup, findMember } from "../lib/wiseOldMan.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const config = await prisma.osrsSyncConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config || { enabled: true, womGroupId: "", womGroupName: "", linkChannelId: "", rankMappings: "[]" });
});

router.put("/guild/:guildId", requireAuth, async (req, res) => {
  const { enabled, womGroupId, linkChannelId, rankMappings } = req.body;

  let womGroupName = null;
  if (womGroupId) {
    try {
      const group = await fetchGroup(womGroupId);
      womGroupName = group.name;
    } catch (err) {
      return res.status(400).json({ error: "Couldn't find a Wise Old Man group with that ID — double check it on wiseoldman.net." });
    }
  }

  const data = { enabled, womGroupId, womGroupName, linkChannelId: linkChannelId || null, rankMappings };
  const config = await prisma.osrsSyncConfig.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });
  res.json(config);
});

// Posts (or re-posts, editing in place) the "link your RSN" panel to a channel —
// same send/edit-in-place pattern used for ticket panels and reaction roles.
router.post("/guild/:guildId/send", requireAuth, async (req, res) => {
  const { channelId } = req.body;
  const config = await prisma.osrsSyncConfig.findUnique({ where: { guildId: req.params.guildId } });
  if (!config) return res.status(404).json({ error: "Set up OSRS sync first." });

  const embed = {
    title: "Link your OSRS account",
    description: `Click below and enter your in-game name to link your account${config.womGroupName ? ` with **${config.womGroupName}**` : ""}. Your Discord role will automatically match your current clan rank.`,
    color: 0x5865f2,
  };
  const button = { type: 2, style: 1, label: "Link RSN", custom_id: "tz_osrs_link", emoji: { name: "⚔️" } };

  try {
    let message;
    if (config.linkChannelId === channelId && config.linkMessageId) {
      const { data } = await botApi.patch(`/channels/${channelId}/messages/${config.linkMessageId}`, {
        embeds: [embed],
        components: [{ type: 1, components: [button] }],
      });
      message = data;
    } else {
      const { data } = await botApi.post(`/channels/${channelId}/messages`, {
        embeds: [embed],
        components: [{ type: 1, components: [button] }],
      });
      message = data;
    }
    const updated = await prisma.osrsSyncConfig.update({
      where: { guildId: req.params.guildId },
      data: { linkChannelId: channelId, linkMessageId: message.id },
    });
    res.json(updated);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Couldn't send the panel — make sure Ticket Zick can view and send messages in that channel." });
  }
});

router.post("/guild/:guildId/sync-now", requireAuth, async (req, res) => {
  const result = await syncGuildRoles(req.params.guildId);
  res.json(result);
});

// Bot-facing: called after someone submits their RSN via the link modal.
router.post("/bot/link", requireBotSecret, async (req, res) => {
  const { guildId, discordId, rsn } = req.body;

  const config = await prisma.osrsSyncConfig.findUnique({ where: { guildId } });
  if (!config || !config.womGroupId) {
    return res.status(400).json({ error: "OSRS sync isn't set up on this server yet." });
  }

  let roster;
  try {
    const group = await fetchGroup(config.womGroupId);
    roster = group.members;
  } catch {
    return res.status(500).json({ error: "Couldn't reach Wise Old Man right now — try again in a moment." });
  }

  const member = findMember(roster, rsn);
  if (!member) {
    return res.status(404).json({
      error: `Couldn't find "${rsn}" in the clan's Wise Old Man group. Double-check the spelling, or make sure your account has synced on wiseoldman.net.`,
    });
  }

  const mappings = JSON.parse(config.rankMappings || "[]");
  const allMappedRoleIds = mappings.map((m) => m.roleId).filter(Boolean);
  const roleId = mappings.find((m) => m.womRole === member.role)?.roleId;

  // Check what rank roles they currently hold (if any) and clean those up too —
  // covers the case where someone re-links after their rank changed since they
  // last synced.
  try {
    const { data: discordMember } = await botApi.get(`/guilds/${guildId}/members/${discordId}`);
    const currentRankRoleIds = (discordMember.roles || []).filter((id) => allMappedRoleIds.includes(id));
    for (const rId of currentRankRoleIds) {
      if (rId !== roleId) await botApi.delete(`/guilds/${guildId}/members/${discordId}/roles/${rId}`);
    }
    if (roleId && !currentRankRoleIds.includes(roleId)) {
      await botApi.put(`/guilds/${guildId}/members/${discordId}/roles/${roleId}`);
    }
  } catch (err) {
    console.error("Failed to assign OSRS rank role:", err.response?.data || err.message);
  }

  await prisma.osrsLink.upsert({
    where: { guildId_discordId: { guildId, discordId } },
    create: { guildId, discordId, rsn: member.username, lastRole: member.role },
    update: { rsn: member.username, lastRole: member.role },
  });

  res.json({ ok: true, rsn: member.username, role: member.role, roleId: roleId || null });
});

// Re-checks every linked member's current clan rank against their last-known one,
// and updates Discord roles for anyone whose rank changed. Used by both the
// dashboard's "Sync now" button and the periodic background job in index.js.
//
// Checks each member's actual current Discord roles (not just a stored "last
// known" value) before deciding what to change — so it self-corrects if someone's
// role was ever changed manually outside the bot, rather than assuming our
// database is always right.
export async function syncGuildRoles(guildId) {
  const config = await prisma.osrsSyncConfig.findUnique({ where: { guildId } });
  if (!config || !config.enabled || !config.womGroupId) return { skipped: true };

  let roster;
  try {
    const group = await fetchGroup(config.womGroupId);
    roster = group.members;
  } catch (err) {
    console.error(`OSRS sync: couldn't fetch WOM group for guild ${guildId}:`, err.response?.data || err.message);
    return { error: "Couldn't reach Wise Old Man." };
  }

  const mappings = JSON.parse(config.rankMappings || "[]");
  const allMappedRoleIds = mappings.map((m) => m.roleId).filter(Boolean);
  const roleForRank = (rank) => mappings.find((m) => m.womRole === rank)?.roleId;

  const links = await prisma.osrsLink.findMany({ where: { guildId } });
  let updated = 0;
  let notFound = 0;

  for (const link of links) {
    const member = findMember(roster, link.rsn);
    if (!member) {
      notFound++;
      continue;
    }

    const targetRoleId = roleForRank(member.role);

    let discordMember;
    try {
      const { data } = await botApi.get(`/guilds/${guildId}/members/${link.discordId}`);
      discordMember = data;
    } catch {
      continue; // they may have left the server — nothing to update
    }

    const currentRankRoleIds = (discordMember.roles || []).filter((id) => allMappedRoleIds.includes(id));
    const alreadyCorrect = targetRoleId
      ? currentRankRoleIds.length === 1 && currentRankRoleIds[0] === targetRoleId
      : currentRankRoleIds.length === 0;

    if (alreadyCorrect) {
      if (member.role !== link.lastRole) {
        await prisma.osrsLink.update({ where: { id: link.id }, data: { lastRole: member.role } });
      }
      continue;
    }

    try {
      for (const roleId of currentRankRoleIds) {
        if (roleId !== targetRoleId) await botApi.delete(`/guilds/${guildId}/members/${link.discordId}/roles/${roleId}`);
      }
      if (targetRoleId && !currentRankRoleIds.includes(targetRoleId)) {
        await botApi.put(`/guilds/${guildId}/members/${link.discordId}/roles/${targetRoleId}`);
      }
      await prisma.osrsLink.update({ where: { id: link.id }, data: { lastRole: member.role } });
      updated++;
    } catch (err) {
      console.error(`OSRS sync: failed to update role for ${link.discordId} in ${guildId}:`, err.response?.data || err.message);
    }
  }

  return { checked: links.length, updated, notFound };
}

export default router;
