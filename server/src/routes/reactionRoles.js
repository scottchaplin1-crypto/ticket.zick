import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const panels = await prisma.reactionRolePanel.findMany({ where: { guildId: req.params.guildId } });
  res.json(panels);
});

router.post("/guild/:guildId", requireAuth, async (req, res) => {
  const panel = await prisma.reactionRolePanel.create({ data: { guildId: req.params.guildId, ...sanitize(req.body) } });
  res.json(panel);
});

router.patch("/:panelId", requireAuth, async (req, res) => {
  const panel = await prisma.reactionRolePanel.update({ where: { id: req.params.panelId }, data: sanitize(req.body) });
  res.json(panel);
});

router.delete("/:panelId", requireAuth, async (req, res) => {
  await prisma.reactionRolePanel.delete({ where: { id: req.params.panelId } });
  res.json({ ok: true });
});

// Posts (or re-posts) the panel to Discord, adding one reaction per mapping so
// people just click to react — same "send from dashboard" pattern as ticket panels.
router.post("/:panelId/send", requireAuth, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "channelId is required" });

  const panel = await prisma.reactionRolePanel.findUnique({ where: { id: req.params.panelId } });
  if (!panel) return res.status(404).json({ error: "Panel not found" });

  const mappings = JSON.parse(panel.mappings || "[]");
  if (mappings.length === 0) return res.status(400).json({ error: "Add at least one role mapping before sending." });

  const description =
    (panel.description ? panel.description + "\n\n" : "") +
    mappings.map((m) => `${emojiForText(m.emoji)} — ${m.label || "Role"}`).join("\n");

  const embed = {
    title: panel.title,
    description,
    color: parseInt(panel.color.replace("#", ""), 16) || 0x5865f2,
  };

  try {
    const { data: message } = await botApi.post(`/channels/${channelId}/messages`, { embeds: [embed] });

    for (const m of mappings) {
      await botApi.put(`/channels/${channelId}/messages/${message.id}/reactions/${encodeURIComponent(m.emoji)}/@me`);
    }

    const updated = await prisma.reactionRolePanel.update({
      where: { id: panel.id },
      data: { channelId, messageId: message.id },
    });
    res.json(updated);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: "Couldn't send the panel — make sure Ticket Zick can view, send messages, and add reactions in that channel.",
    });
  }
});

// Bot-facing: when someone reacts, the bot looks up which panel (if any) that
// message belongs to, to know what role to grant/remove.
router.get("/bot/by-message/:messageId", requireBotSecret, async (req, res) => {
  const panel = await prisma.reactionRolePanel.findFirst({ where: { messageId: req.params.messageId } });
  if (!panel) return res.status(404).json({ error: "Not found" });
  res.json(panel);
});

// Emoji values are stored as either a plain unicode character or, for a custom
// server emoji, "name:id" — that raw format works fine for the reaction endpoint
// itself, but needs Discord's <:name:id> bracket syntax to actually render as an
// emoji inside embed text rather than showing as plain "name:id".
function emojiForText(value) {
  const customMatch = value.match(/^([\w~]+):(\d{15,21})$/);
  return customMatch ? `<:${customMatch[1]}:${customMatch[2]}>` : value;
}

function sanitize(body) {
  const allowed = ["name", "title", "description", "color", "mode", "mappings"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  return out;
}

export default router;
