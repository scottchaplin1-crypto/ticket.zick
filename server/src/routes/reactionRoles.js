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

// Posts (or re-posts) the panel to Discord. Reaction panels add one reaction per
// mapping so people just click to react. Button panels attach real buttons
// instead — more discoverable (the role name is right there on the button, no
// need to know what an emoji means), and works better on mobile where adding a
// reaction is fiddlier than tapping a button.
router.post("/:panelId/send", requireAuth, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "channelId is required" });

  const panel = await prisma.reactionRolePanel.findUnique({ where: { id: req.params.panelId } });
  if (!panel) return res.status(404).json({ error: "Panel not found" });

  const mappings = JSON.parse(panel.mappings || "[]");
  if (mappings.length === 0) return res.status(400).json({ error: "Add at least one role mapping before sending." });
  if (panel.deliveryMethod === "button" && mappings.length > 25) {
    return res.status(400).json({ error: "Discord allows a maximum of 25 buttons on one message — trim your mappings down, or switch this panel to reactions instead." });
  }

  const isButtons = panel.deliveryMethod === "button";
  const description = isButtons
    ? panel.description // the buttons themselves show each role's name — no need to also list them in text
    : (panel.description ? panel.description + "\n\n" : "") + mappings.map((m) => `${emojiForText(m.emoji)} — ${m.label || "Role"}`).join("\n");

  const embed = {
    title: panel.title,
    description,
    color: parseInt(panel.color.replace("#", ""), 16) || 0x5865f2,
  };

  const payload = { embeds: [embed] };
  if (isButtons) {
    payload.components = buildButtonRows(panel.id, mappings);
  }

  try {
    let message;
    if (panel.messageId) {
      // Re-sending to the same channel it's already posted in updates that
      // message in place instead of creating a duplicate — same pattern as
      // ticket panels and embed messages.
      try {
        const { data } = await botApi.patch(`/channels/${channelId}/messages/${panel.messageId}`, payload);
        message = data;
      } catch {
        const { data } = await botApi.post(`/channels/${channelId}/messages`, payload);
        message = data;
      }
    } else {
      const { data } = await botApi.post(`/channels/${channelId}/messages`, payload);
      message = data;
    }

    if (!isButtons) {
      for (const m of mappings) {
        await botApi.put(`/channels/${channelId}/messages/${message.id}/reactions/${encodeURIComponent(m.emoji)}/@me`);
      }
    }

    const updated = await prisma.reactionRolePanel.update({
      where: { id: panel.id },
      data: { channelId, messageId: message.id },
    });
    res.json(updated);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: `Couldn't send the panel — make sure Ticket Zick can view, send messages, and ${isButtons ? "use buttons" : "add reactions"} in that channel.`,
    });
  }
});

const BUTTON_STYLE_VALUES = { Primary: 1, Secondary: 2, Success: 3, Danger: 4 };

function buildButtonRows(panelId, mappings) {
  const rows = [];
  for (let i = 0; i < mappings.length; i += 5) {
    const buttons = mappings.slice(i, i + 5).map((m) => {
      const customEmoji = (m.emoji || "").match(/^([\w~]+):(\d{15,21})$/);
      const button = {
        type: 2,
        style: BUTTON_STYLE_VALUES[m.style] || 2, // defaults to Secondary/gray for mappings saved before this was added
        custom_id: `tz_rr:${panelId}:${m.roleId}`,
        label: (m.label || "Role").slice(0, 80),
      };
      if (customEmoji) button.emoji = { name: customEmoji[1], id: customEmoji[2] };
      else if (m.emoji) button.emoji = { name: m.emoji };
      return button;
    });
    rows.push({ type: 1, components: buttons });
  }
  return rows;
}

// Bot-facing: when someone clicks a role button, the panel ID is already
// encoded right in the button's custom_id, so this is a direct lookup — no
// message-ID indirection needed the way reactions require.
router.get("/bot/:panelId", requireBotSecret, async (req, res) => {
  const panel = await prisma.reactionRolePanel.findUnique({ where: { id: req.params.panelId } });
  if (!panel) return res.status(404).json({ error: "Not found" });
  res.json(panel);
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
  const allowed = ["name", "title", "description", "color", "mode", "deliveryMethod", "mappings"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  return out;
}

export default router;
