import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { isGuildSubscribed } from "../lib/stripe.js";

const router = Router();

router.get("/guild/:guildId/staff-roles", requireAuth, async (req, res) => {
  const roles = await prisma.staffRole.findMany({ where: { guildId: req.params.guildId } });
  res.json(roles);
});

router.post("/guild/:guildId/staff-roles", requireAuth, async (req, res) => {
  const { roleId, roleName } = req.body;
  const role = await prisma.staffRole.upsert({
    where: { guildId_roleId: { guildId: req.params.guildId, roleId } },
    create: { guildId: req.params.guildId, roleId, roleName },
    update: { roleName },
  });
  res.json(role);
});

router.delete("/guild/:guildId/staff-roles/:roleId", requireAuth, async (req, res) => {
  await prisma.staffRole.delete({
    where: { guildId_roleId: { guildId: req.params.guildId, roleId: req.params.roleId } },
  });
  res.json({ ok: true });
});

// Bot-facing: fetch staff roles + custom commands for permission overwrites /
// message matching. Staff roles power ticket permission overwrites, which stay
// free — so this deliberately does NOT gate the whole endpoint, only strips
// custom commands (a paid feature) out of the response for unsubscribed
// guilds, leaving staff roles and the quick-add trigger working normally either way.
router.get("/bot/:guildId/full", requireBotSecret, async (req, res) => {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.guildId },
    include: { staffRoles: true, customCommands: true },
  });
  if (!guild) return res.status(404).json({ error: "Not found" });

  const subscribed = await isGuildSubscribed(req.params.guildId);
  if (!subscribed) guild.customCommands = [];

  res.json(guild);
});

export default router;
