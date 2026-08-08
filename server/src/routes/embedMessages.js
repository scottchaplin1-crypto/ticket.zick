import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const messages = await prisma.embedMessage.findMany({ where: { guildId: req.params.guildId }, orderBy: { updatedAt: "desc" } });
  res.json(messages);
});

router.post("/guild/:guildId", requireAuth, async (req, res) => {
  const message = await prisma.embedMessage.create({ data: { guildId: req.params.guildId, ...sanitize(req.body) } });
  res.json(message);
});

router.patch("/:id", requireAuth, async (req, res) => {
  const message = await prisma.embedMessage.update({ where: { id: req.params.id }, data: sanitize(req.body) });
  res.json(message);
});

router.delete("/:id", requireAuth, async (req, res) => {
  await prisma.embedMessage.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// Posts (or, if re-sending to the same channel it was last posted in, edits in
// place) the message via the bot — never a webhook, since the bot is the one
// managing this content and needs to be able to find/update it later.
router.post("/:id/send", requireAuth, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "channelId is required" });

  const msg = await prisma.embedMessage.findUnique({ where: { id: req.params.id } });
  if (!msg) return res.status(404).json({ error: "Not found" });

  let embeds;
  try {
    embeds = JSON.parse(msg.embeds || "[]").map(toDiscordEmbed);
  } catch {
    embeds = [];
  }

  if (!msg.content?.trim() && embeds.length === 0) {
    return res.status(400).json({ error: "Add some text or at least one embed before sending." });
  }

  const payload = { content: msg.content?.trim() || undefined, embeds: embeds.length ? embeds : undefined };

  try {
    let discordMessage;
    if (msg.channelId === channelId && msg.messageId) {
      // Same channel as last time — edit that message instead of posting a duplicate.
      const { data } = await botApi.patch(`/channels/${channelId}/messages/${msg.messageId}`, payload);
      discordMessage = data;
    } else {
      const { data } = await botApi.post(`/channels/${channelId}/messages`, payload);
      discordMessage = data;
    }

    const updated = await prisma.embedMessage.update({
      where: { id: msg.id },
      data: { channelId, messageId: discordMessage.id },
    });
    res.json(updated);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: "Couldn't send — make sure Ticket Zick can view and send messages in that channel, and check any image URLs are valid.",
    });
  }
});

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

function sanitize(body) {
  const allowed = ["name", "content", "embeds"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  return out;
}

export default router;
