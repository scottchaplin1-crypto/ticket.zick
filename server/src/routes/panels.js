import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";

const router = Router();

// --- Dashboard-facing (cookie auth) ---

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const panels = await prisma.panel.findMany({ where: { guildId: req.params.guildId } });
  res.json(panels);
});

router.post("/guild/:guildId", requireAuth, async (req, res) => {
  const panel = await prisma.panel.create({
    data: { guildId: req.params.guildId, ...sanitize(req.body) },
  });
  res.json(panel);
});

router.patch("/:panelId", requireAuth, async (req, res) => {
  const panel = await prisma.panel.update({
    where: { id: req.params.panelId },
    data: sanitize(req.body),
  });
  res.json(panel);
});

router.delete("/:panelId", requireAuth, async (req, res) => {
  await prisma.panel.delete({ where: { id: req.params.panelId } });
  res.json({ ok: true });
});

// --- Bot-facing (shared secret auth) ---

router.get("/bot/:panelId", requireBotSecret, async (req, res) => {
  const panel = await prisma.panel.findUnique({ where: { id: req.params.panelId } });
  if (!panel) return res.status(404).json({ error: "Not found" });
  res.json(panel);
});

router.patch("/bot/:panelId/message", requireBotSecret, async (req, res) => {
  const { channelId, messageId } = req.body;
  const panel = await prisma.panel.update({
    where: { id: req.params.panelId },
    data: { channelId, messageId },
  });
  res.json(panel);
});

function sanitize(body) {
  const allowed = [
    "name", "embedTitle", "embedDescription", "embedColor", "embedImageUrl",
    "embedThumbnailUrl", "buttonLabel", "buttonEmoji", "buttonStyle",
    "ticketCategoryId", "namingPattern", "maxOpenPerUser", "pingRoleIds",
    "transcriptEnabled", "transcriptDestination", "transcriptChannelId",
  ];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  return out;
}

export default router;
