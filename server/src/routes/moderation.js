import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { requireSubscription } from "../middleware/subscription.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, requireSubscription("guildId"), async (req, res) => {
  const config = await prisma.moderationConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config || { modLogChannelId: null, autoBanEnabled: false, autoBanMinAgeDays: 7 });
});

router.put("/guild/:guildId", requireAuth, requireSubscription("guildId"), async (req, res) => {
  const { modLogChannelId, autoBanEnabled, autoBanMinAgeDays } = req.body;
  const data = {
    modLogChannelId: modLogChannelId || null,
    autoBanEnabled,
    autoBanMinAgeDays: parseInt(autoBanMinAgeDays, 10) || 7,
  };
  const config = await prisma.moderationConfig.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });
  res.json(config);
});

// Last 50 actions — the dashboard's audit log view.
router.get("/guild/:guildId/cases", requireAuth, requireSubscription("guildId"), async (req, res) => {
  const cases = await prisma.moderationCase.findMany({
    where: { guildId: req.params.guildId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(cases);
});

router.get("/bot/:guildId", requireBotSecret, requireSubscription("guildId"), async (req, res) => {
  const config = await prisma.moderationConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config);
});

// The bot performs the actual ban/kick itself (it's already got a live Discord
// connection and the interaction context) — this endpoint just records it for the
// dashboard's history, same pattern as everything else here.
router.post("/bot/:guildId/log-case", requireBotSecret, requireSubscription("guildId"), async (req, res) => {
  const { action, targetId, targetTag, moderatorId, reason } = req.body;
  const record = await prisma.moderationCase.create({
    data: { guildId: req.params.guildId, action, targetId, targetTag, moderatorId: moderatorId || null, reason: reason || null },
  });
  res.json(record);
});

export default router;
