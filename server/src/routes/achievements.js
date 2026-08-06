import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const achievements = await prisma.achievementDefinition.findMany({ where: { guildId: req.params.guildId } });
  res.json(achievements);
});

router.post("/guild/:guildId", requireAuth, async (req, res) => {
  const achievement = await prisma.achievementDefinition.create({ data: { guildId: req.params.guildId, ...sanitize(req.body) } });
  res.json(achievement);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const achievement = await prisma.achievementDefinition.update({ where: { id: req.params.id }, data: sanitize(req.body) });
  res.json(achievement);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.achievementDefinition.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Bot calls this every time it observes a trackable action (a message, a reaction,
// a thread created). Does the actual "did this cross a tier threshold" work here in
// one place, rather than the bot having to know anything about tiers itself.
router.post("/bot/increment", requireBotSecret, async (req, res) => {
  const { guildId, userId, statType, amount = 1 } = req.body;

  const stat = await prisma.memberStat.upsert({
    where: { guildId_userId_statType: { guildId, userId, statType } },
    create: { guildId, userId, statType, count: amount },
    update: { count: { increment: amount } },
  });

  const definitions = await prisma.achievementDefinition.findMany({ where: { guildId, statType, enabled: true } });

  const unlocked = [];
  for (const def of definitions) {
    let tiers = [];
    try {
      tiers = JSON.parse(def.tiers || "[]");
    } catch {
      tiers = [];
    }
    for (const tier of tiers) {
      if (stat.count < tier.threshold) continue;
      try {
        await prisma.unlockedTier.create({
          data: { guildId, userId, achievementId: def.id, tier: tier.name },
        });
        unlocked.push({
          achievementName: def.name,
          description: def.description,
          emoji: def.emoji,
          color: def.color,
          tier: tier.name,
          roleId: tier.roleId || null,
          announceChannelId: def.announceChannelId || null,
        });
      } catch {
        // Already unlocked (unique constraint) — nothing to do.
      }
    }
  }

  res.json({ count: stat.count, unlocked });
});

function sanitize(body) {
  const allowed = ["name", "description", "emoji", "color", "statType", "enabled", "announceChannelId", "tiers"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  return out;
}

export default router;
