import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { getUserGuilds, botApi } from "../lib/discord.js";

const router = Router();

const MANAGE_GUILD = 0x20; // permission bit

// Returns guilds the logged-in user manages, flagged with whether Ticket Zick is set up
router.get("/", requireAuth, async (req, res) => {
  try {
    const discordGuilds = await getUserGuilds(req.user.accessToken);
    const manageable = discordGuilds.filter((g) => {
      const perms = BigInt(g.permissions);
      return g.owner || (perms & BigInt(MANAGE_GUILD)) === BigInt(MANAGE_GUILD);
    });

    const setupGuildIds = (
      await prisma.guild.findMany({
        where: { id: { in: manageable.map((g) => g.id) } },
        select: { id: true },
      })
    ).map((g) => g.id);

    res.json(
      manageable.map((g) => ({
        id: g.id,
        name: g.name,
        icon: g.icon,
        isSetUp: setupGuildIds.includes(g.id),
      }))
    );
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to load guilds" });
  }
});

// Registers/initialises a guild in Ticket Zick (called first time a user opens a server's dashboard)
router.post("/:guildId/setup", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  const { name, icon } = req.body;

  const guild = await prisma.guild.upsert({
    where: { id: guildId },
    create: {
      id: guildId,
      name,
      icon,
      ownerId: req.user.id,
      branding: { create: {} },
    },
    update: { name, icon },
    include: { branding: true },
  });

  res.json(guild);
});

router.get("/:guildId", requireAuth, async (req, res) => {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.guildId },
    include: { branding: true, panels: true, staffRoles: true },
  });
  if (!guild) return res.status(404).json({ error: "Guild not found" });
  res.json(guild);
});

// Lets the dashboard show real channel names in dropdowns instead of asking people
// to copy/paste raw Discord IDs. Uses the bot's own token, since the bot is already
// in the server and the logged-in dashboard user might not have that scope.
router.get("/:guildId/channels", requireAuth, async (req, res) => {
  try {
    const { data } = await botApi.get(`/guilds/${req.params.guildId}/channels`);
    res.json(
      data
        .filter((c) => [0, 4].includes(c.type)) // 0 = text channel, 4 = category
        .sort((a, b) => a.position - b.position)
        .map((c) => ({ id: c.id, name: c.name, type: c.type, parentId: c.parent_id }))
    );
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Couldn't load channels — is the bot still in this server?" });
  }
});

export default router;
