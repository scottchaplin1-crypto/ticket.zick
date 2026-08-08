import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const messages = await prisma.autoMessage.findMany({ where: { guildId: req.params.guildId }, orderBy: { updatedAt: "desc" } });
  res.json(messages);
});

router.post("/guild/:guildId", requireAuth, async (req, res) => {
  const message = await prisma.autoMessage.create({ data: { guildId: req.params.guildId, ...sanitize(req.body) } });
  res.json(message);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const message = await prisma.autoMessage.update({ where: { id: req.params.id }, data: sanitize(req.body) });
  res.json(message);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.autoMessage.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Posts it immediately and resets the interval clock — lets someone test a
// message right now instead of waiting for its next scheduled time.
router.post("/:id/send-now", requireAuth, async (req, res) => {
  const message = await prisma.autoMessage.findUnique({ where: { id: req.params.id } });
  if (!message) return res.status(404).json({ error: "Not found" });
  try {
    await postAutoMessage(message);
    const updated = await prisma.autoMessage.update({ where: { id: message.id }, data: { lastSentAt: new Date() } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || "Couldn't send that message." });
  }
});

function sanitize(body) {
  const allowed = ["name", "content", "embeds", "channelId", "intervalMinutes", "enabled"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  if ("intervalMinutes" in out) out.intervalMinutes = Math.max(1, parseInt(out.intervalMinutes, 10) || 60);
  return out;
}

async function postAutoMessage(message) {
  let embeds = [];
  try {
    embeds = JSON.parse(message.embeds || "[]").map(toDiscordEmbed);
  } catch {
    embeds = [];
  }
  if (!message.content?.trim() && embeds.length === 0) {
    throw new Error("This message has no text or embeds to send.");
  }
  await botApi.post(`/channels/${message.channelId}/messages`, {
    content: message.content?.trim() || undefined,
    embeds: embeds.length ? embeds : undefined,
  });
}

function toDiscordEmbed(e) {
  const embed = {};
  if (e.title) embed.title = e.title.slice(0, 256);
  if (e.description) embed.description = e.description.slice(0, 4096);
  if (e.color) embed.color = parseInt(String(e.color).replace("#", ""), 16) || undefined;
  if (e.url) embed.url = e.url;
  if (e.authorName) embed.author = { name: e.authorName.slice(0, 256), icon_url: e.authorIconUrl || undefined };
  if (e.footerText) embed.footer = { text: e.footerText.slice(0, 2048), icon_url: e.footerIconUrl || undefined };
  if (e.imageUrl) embed.image = { url: e.imageUrl };
  if (e.thumbnailUrl) embed.thumbnail = { url: e.thumbnailUrl };
  const fields = (e.fields || []).filter((f) => f.name?.trim() && f.value?.trim());
  if (fields.length) embed.fields = fields.slice(0, 25).map((f) => ({ name: f.name.slice(0, 256), value: f.value.slice(0, 1024), inline: !!f.inline }));
  return embed;
}

// Checked every minute — posts any auto message whose interval has elapsed since
// it last sent (or since it was created/enabled, if it's never sent yet).
export async function runAutoMessageSweep() {
  const due = await prisma.autoMessage.findMany({ where: { enabled: true } });
  const now = Date.now();

  for (const message of due) {
    const last = message.lastSentAt ? new Date(message.lastSentAt).getTime() : new Date(message.createdAt).getTime();
    const dueAt = last + message.intervalMinutes * 60 * 1000;
    if (now < dueAt) continue;

    try {
      await postAutoMessage(message);
      await prisma.autoMessage.update({ where: { id: message.id }, data: { lastSentAt: new Date() } });
    } catch (err) {
      console.error(`Auto message ${message.id} failed to send:`, err.response?.data || err.message);
      // Still bump lastSentAt on failure too — otherwise a persistently broken
      // message (bad channel, missing permission) would retry every single
      // minute forever instead of waiting for its normal interval again.
      await prisma.autoMessage.update({ where: { id: message.id }, data: { lastSentAt: new Date() } });
    }
  }
}

export default router;
