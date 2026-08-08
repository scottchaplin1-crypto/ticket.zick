import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { requireSubscription } from "../middleware/subscription.js";
import { botApi } from "../lib/discord.js";

const router = Router();

// A few routes are keyed by the poll's own ID rather than a guild ID directly
// — this looks up the owning guild first so the same gating still applies.
const gateByPollGuild = requireSubscription(async (req) => {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
  return poll?.guildId;
});

// ---------- Dashboard visibility (read-only — creation is command-driven) ----------

router.get("/guild/:guildId", requireAuth, requireSubscription("guildId"), async (req, res) => {
  const polls = await prisma.poll.findMany({ where: { guildId: req.params.guildId }, orderBy: { createdAt: "desc" }, take: 50 });
  res.json(polls);
});

// ---------- Bot-facing ----------

router.post("/bot/:guildId/create", requireBotSecret, requireSubscription("guildId"), async (req, res) => {
  const { question, options, channelId, endsAt, hostId } = req.body;
  const poll = await prisma.poll.create({
    data: { guildId: req.params.guildId, question, options: JSON.stringify(options), channelId, endsAt: new Date(endsAt), hostId },
  });
  res.json(poll);
});

router.patch("/bot/:id/message", requireBotSecret, gateByPollGuild, async (req, res) => {
  const poll = await prisma.poll.update({ where: { id: req.params.id }, data: { messageId: req.body.messageId } });
  res.json(poll);
});

router.get("/bot/:guildId/active-in-channel/:channelId", requireBotSecret, requireSubscription("guildId"), async (req, res) => {
  const poll = await prisma.poll.findFirst({
    where: { guildId: req.params.guildId, channelId: req.params.channelId, ended: false },
    orderBy: { createdAt: "desc" },
  });
  res.json(poll || null);
});

router.post("/bot/:id/vote", requireBotSecret, gateByPollGuild, async (req, res) => {
  const { userId, optionIndex } = req.body;
  const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
  if (!poll || poll.ended) return res.status(400).json({ error: "This poll has ended." });

  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId: poll.id, userId } },
    create: { pollId: poll.id, userId, optionIndex },
    update: { optionIndex },
  });

  const options = JSON.parse(poll.options || "[]");
  res.json({ ok: true, votedFor: options[optionIndex] });
});

router.post("/bot/:id/end", requireBotSecret, gateByPollGuild, async (req, res) => {
  const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
  if (!poll) return res.status(404).json({ error: "Not found" });
  if (poll.ended) return res.status(400).json({ error: "Already ended." });
  const result = await endPoll(poll);
  res.json(result);
});

// A simple text bar chart — 10 blocks per option, filled proportionally to its
// share of the vote. No external chart library needed for something this simple.
function buildResultsText(question, options, votesByOption, totalVotes) {
  const lines = options.map((opt, i) => {
    const count = votesByOption[i] || 0;
    const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
    const filled = totalVotes ? Math.round((count / totalVotes) * 10) : 0;
    const bar = "🟦".repeat(filled) + "⬜".repeat(10 - filled);
    return `**${opt}**\n${bar} ${pct}% (${count} vote${count === 1 ? "" : "s"})`;
  });
  return `📊 **Poll results: ${question}**\n\n${lines.join("\n\n")}\n\n*${totalVotes} total vote${totalVotes === 1 ? "" : "s"}*`;
}

export async function endPoll(poll) {
  const votes = await prisma.pollVote.findMany({ where: { pollId: poll.id } });
  const options = JSON.parse(poll.options || "[]");
  const votesByOption = {};
  for (const v of votes) votesByOption[v.optionIndex] = (votesByOption[v.optionIndex] || 0) + 1;

  await prisma.poll.update({ where: { id: poll.id }, data: { ended: true } });

  const resultText = buildResultsText(poll.question, options, votesByOption, votes.length);

  try {
    await botApi.post(`/channels/${poll.channelId}/messages`, { content: resultText });
  } catch (err) {
    console.error("Failed to post poll results:", err.response?.data || err.message);
  }

  if (poll.messageId) {
    try {
      await botApi.patch(`/channels/${poll.channelId}/messages/${poll.messageId}`, {
        embeds: [{ title: `📊 POLL ENDED: ${poll.question}`, color: 0x99aab5, description: "See results below." }],
        components: [],
      });
    } catch (err) {
      console.error("Failed to update ended poll message:", err.response?.data || err.message);
    }
  }

  return { votesByOption, total: votes.length };
}

// Checked every minute — closes any poll whose timer has run out.
export async function runPollSweep() {
  const due = await prisma.poll.findMany({ where: { ended: false, endsAt: { lte: new Date() } } });
  for (const poll of due) {
    await endPoll(poll).catch((err) => console.error(`Poll ${poll.id} failed to end:`, err.message));
  }
}

export default router;
