import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";

const router = Router();

// --- Dashboard-facing ---

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const tickets = await prisma.ticket.findMany({
    where: { guildId: req.params.guildId },
    orderBy: { createdAt: "desc" },
    include: { panel: { select: { name: true } } },
  });
  res.json(tickets);
});

// --- Bot-facing ---

router.post("/bot", requireBotSecret, async (req, res) => {
  const { guildId, panelId, channelId, openerId, openerUsername } = req.body;

  const count = await prisma.ticket.count({ where: { panelId } });

  const ticket = await prisma.ticket.create({
    data: {
      guildId,
      panelId,
      channelId,
      openerId,
      openerUsername,
      number: count + 1,
    },
  });
  res.json(ticket);
});

router.get("/bot/by-channel/:channelId", requireBotSecret, async (req, res) => {
  const ticket = await prisma.ticket.findFirst({
    where: { channelId: req.params.channelId },
    include: { panel: true },
  });
  if (!ticket) return res.status(404).json({ error: "Not found" });
  res.json(ticket);
});

router.get("/bot/open-count", requireBotSecret, async (req, res) => {
  const { panelId, openerId } = req.query;
  const count = await prisma.ticket.count({
    where: { panelId, openerId, status: { not: "closed" } },
  });
  res.json({ count });
});

router.patch("/bot/:ticketId", requireBotSecret, async (req, res) => {
  const { status, claimedById, transcriptUrl } = req.body;
  const data = {};
  if (status) data.status = status;
  if (claimedById !== undefined) data.claimedById = claimedById;
  if (transcriptUrl) data.transcriptUrl = transcriptUrl;
  if (status === "closed") data.closedAt = new Date();

  const ticket = await prisma.ticket.update({
    where: { id: req.params.ticketId },
    data,
  });
  res.json(ticket);
});

export default router;
