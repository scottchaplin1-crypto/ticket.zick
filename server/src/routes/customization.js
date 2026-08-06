import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";

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

// Bot-facing: fetch staff roles + custom commands for permission overwrites / message
// matching. (Branding used to be included here too — removed along with the page.)
router.get("/bot/:guildId/full", requireBotSecret, async (req, res) => {
  const guild = await prisma.guild.findUnique({
    where: { id: req.params.guildId },
    include: { staffRoles: true, customCommands: true },
  });
  if (!guild) return res.status(404).json({ error: "Not found" });
  res.json(guild);
});

export default router;
