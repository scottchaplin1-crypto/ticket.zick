import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

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

// Posts the panel's embed + button straight to a Discord channel from the dashboard,
// so nobody needs to run /panel-send manually. Talks to Discord's REST API directly
// with the bot's own token, building the same message shape discord.js would.
router.post("/:panelId/send", requireAuth, async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) return res.status(400).json({ error: "channelId is required" });

  const panel = await prisma.panel.findUnique({ where: { id: req.params.panelId } });
  if (!panel) return res.status(404).json({ error: "Panel not found" });

  const STYLE_MAP = { Primary: 1, Secondary: 2, Success: 3, Danger: 4 };

  const embed = {
    title: panel.embedTitle,
    description: panel.embedDescription,
    color: parseInt(panel.embedColor.replace("#", ""), 16) || 0x5865f2,
  };
  if (panel.embedImageUrl) embed.image = { url: panel.embedImageUrl };
  if (panel.embedThumbnailUrl) embed.thumbnail = { url: panel.embedThumbnailUrl };

  const button = {
    type: 2,
    style: STYLE_MAP[panel.buttonStyle] || 1,
    label: panel.buttonLabel,
    custom_id: `tz_open:${panel.id}`,
  };
  if (panel.buttonEmoji) button.emoji = parseEmojiForButton(panel.buttonEmoji);

  try {
    const payload = {
      embeds: [embed],
      components: [{ type: 1, components: [button] }],
    };

    let message;
    if (panel.channelId === channelId && panel.messageId) {
      // Re-sending to the same channel it's already in — edit that message in
      // place instead of posting a duplicate, same as Reaction Roles and Embed
      // Messages already do.
      const { data } = await botApi.patch(`/channels/${channelId}/messages/${panel.messageId}`, payload);
      message = data;
    } else {
      const { data } = await botApi.post(`/channels/${channelId}/messages`, payload);
      message = data;
    }

    const updated = await prisma.panel.update({
      where: { id: panel.id },
      data: { channelId, messageId: message.id },
    });

    res.json(updated);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      error: "Couldn't send the panel — make sure Ticket Zick has permission to view and send messages in that channel.",
    });
  }
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

// Emoji values are stored as either a plain unicode character ("🎫") or, for a
// custom server emoji, "name:id" (e.g. "onyx:1411143283991908533"). Discord's
// button JSON needs a structured object for custom emojis, not a plain string.
function parseEmojiForButton(value) {
  const customMatch = value.match(/^([\w~]+):(\d{15,21})$/);
  if (customMatch) return { name: customMatch[1], id: customMatch[2] };
  return { name: value };
}

function sanitize(body) {
  const allowed = [
    "name", "embedTitle", "embedDescription", "embedColor", "embedImageUrl",
    "embedThumbnailUrl", "buttonLabel", "buttonEmoji", "buttonStyle",
    "ticketCategoryId", "namingPattern", "maxOpenPerUser", "pingRoleIds", "tagStaffOnOpen", "accessRoleIds",
    "welcomeMessage", "footerText",
    "questionsEnabled", "questions",
    "transcriptEnabled", "transcriptDestination", "transcriptChannelId",
  ];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  return out;
}

export default router;
