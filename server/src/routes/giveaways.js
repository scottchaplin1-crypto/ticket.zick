import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

const router = Router();

// ---------- Dashboard visibility (read-only — creation is command-driven) ----------

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const giveaways = await prisma.giveaway.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json(giveaways);
});

// ---------- Bot-facing ----------

router.post("/bot/:guildId/create", requireBotSecret, async (req, res) => {
  const { prize, description, winnerCount, requiredRoleId, channelId, endsAt, hostId } = req.body;
  const giveaway = await prisma.giveaway.create({
    data: {
      guildId: req.params.guildId,
      prize,
      description: description || "",
      winnerCount: Math.max(1, parseInt(winnerCount, 10) || 1),
      requiredRoleId: requiredRoleId || null,
      channelId,
      endsAt: new Date(endsAt),
      hostId,
    },
  });
  res.json(giveaway);
});

router.patch("/bot/:id/message", requireBotSecret, async (req, res) => {
  const giveaway = await prisma.giveaway.update({ where: { id: req.params.id }, data: { messageId: req.body.messageId } });
  res.json(giveaway);
});

router.get("/bot/:id", requireBotSecret, async (req, res) => {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: req.params.id } });
  if (!giveaway) return res.status(404).json({ error: "Not found" });
  const entryCount = await prisma.giveawayEntry.count({ where: { giveawayId: giveaway.id } });
  res.json({ ...giveaway, entryCount });
});

// Finds the most recent still-active giveaway in a channel — lets staff just run
// /giveaway end in the same channel rather than needing to look up an ID.
router.get("/bot/:guildId/active-in-channel/:channelId", requireBotSecret, async (req, res) => {
  const giveaway = await prisma.giveaway.findFirst({
    where: { guildId: req.params.guildId, channelId: req.params.channelId, ended: false },
    orderBy: { createdAt: "desc" },
  });
  res.json(giveaway || null);
});

// Toggle entry — join if not entered, leave if already entered. hasRole is
// computed bot-side (the server doesn't have live role data).
router.post("/bot/:id/toggle-entry", requireBotSecret, async (req, res) => {
  const { userId, hasRole } = req.body;
  const giveaway = await prisma.giveaway.findUnique({ where: { id: req.params.id } });
  if (!giveaway || giveaway.ended) return res.status(400).json({ error: "This giveaway has ended." });
  if (giveaway.requiredRoleId && !hasRole) {
    return res.status(403).json({ error: "You don't meet the role requirement to enter this giveaway." });
  }

  const existing = await prisma.giveawayEntry.findUnique({
    where: { giveawayId_userId: { giveawayId: giveaway.id, userId } },
  });

  if (existing) {
    await prisma.giveawayEntry.delete({ where: { id: existing.id } });
  } else {
    await prisma.giveawayEntry.create({ data: { giveawayId: giveaway.id, userId } });
  }

  const count = await prisma.giveawayEntry.count({ where: { giveawayId: giveaway.id } });
  res.json({ entered: !existing, count });
});

router.post("/bot/:id/end", requireBotSecret, async (req, res) => {
  const giveaway = await prisma.giveaway.findUnique({ where: { id: req.params.id } });
  if (!giveaway) return res.status(404).json({ error: "Not found" });
  if (giveaway.ended) return res.status(400).json({ error: "Already ended." });
  const result = await endGiveaway(giveaway);
  res.json(result);
});

// The actual draw — random winners from entries, marks it ended, and posts the
// result directly (the server can post to Discord itself, no need to go through
// the live bot process for this).
export async function endGiveaway(giveaway) {
  const entries = await prisma.giveawayEntry.findMany({ where: { giveawayId: giveaway.id } });
  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, giveaway.winnerCount).map((e) => e.userId);

  await prisma.giveaway.update({ where: { id: giveaway.id }, data: { ended: true } });

  const resultText = winners.length
    ? `🎉 Congrats ${winners.map((w) => `<@${w}>`).join(", ")}! You won **${giveaway.prize}**!`
    : `😢 No valid entries — nobody won **${giveaway.prize}**.`;

  try {
    await botApi.post(`/channels/${giveaway.channelId}/messages`, { content: resultText });
  } catch (err) {
    console.error("Failed to post giveaway result:", err.response?.data || err.message);
  }

  if (giveaway.messageId) {
    try {
      await botApi.patch(`/channels/${giveaway.channelId}/messages/${giveaway.messageId}`, {
        embeds: [
          {
            title: `🎉 GIVEAWAY ENDED: ${giveaway.prize}`,
            description: giveaway.description || undefined,
            color: 0x99aab5,
            fields: [{ name: "Winner(s)", value: winners.length ? winners.map((w) => `<@${w}>`).join(", ") : "No entries" }],
          },
        ],
        components: [],
      });
    } catch (err) {
      console.error("Failed to update ended giveaway message:", err.response?.data || err.message);
    }
  }

  return { winners };
}

// Checked every minute — draws any giveaway whose timer has run out.
export async function runGiveawaySweep() {
  const due = await prisma.giveaway.findMany({ where: { ended: false, endsAt: { lte: new Date() } } });
  for (const giveaway of due) {
    await endGiveaway(giveaway).catch((err) => console.error(`Giveaway ${giveaway.id} failed to end:`, err.message));
  }
}

export default router;
