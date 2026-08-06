import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { generateWelcomeBanner } from "../lib/welcomeBanner.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const config = await prisma.welcomeConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(
    config || {
      welcomeEnabled: false,
      welcomeChannelId: null,
      welcomeMessage: "Welcome {user} to {server}! We're now {membercount} members strong. 🎉",
      bannerEnabled: false,
      bannerImageUrl: null,
      bannerTitleTemplate: "{username} just joined the server!",
      goodbyeEnabled: false,
      goodbyeChannelId: null,
      goodbyeMessage: "{username} has left {server}. We're now {membercount} members.",
    }
  );
});

router.put("/guild/:guildId", requireAuth, async (req, res) => {
  const {
    welcomeEnabled, welcomeChannelId, welcomeMessage,
    bannerEnabled, bannerImageUrl, bannerTitleTemplate,
    goodbyeEnabled, goodbyeChannelId, goodbyeMessage,
  } = req.body;
  const data = {
    welcomeEnabled, welcomeChannelId, welcomeMessage,
    bannerEnabled, bannerImageUrl, bannerTitleTemplate,
    goodbyeEnabled, goodbyeChannelId, goodbyeMessage,
  };
  const config = await prisma.welcomeConfig.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });
  res.json(config);
});

router.get("/bot/:guildId", requireBotSecret, async (req, res) => {
  const config = await prisma.welcomeConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config); // null is fine — bot treats "no config" as "feature off"
});

// Generates the actual banner PNG. Returns raw image bytes, not JSON — the bot
// fetches this and attaches it directly to the welcome message.
router.get("/bot/:guildId/banner", requireBotSecret, async (req, res) => {
  const { avatarUrl, title, memberCount, backgroundUrl } = req.query;
  try {
    const buffer = await generateWelcomeBanner({ backgroundUrl, avatarUrl, title, memberCount });
    res.set("Content-Type", "image/png");
    res.send(buffer);
  } catch (err) {
    console.error("Failed to generate welcome banner:", err.message);
    res.status(500).json({ error: "Couldn't generate banner" });
  }
});

export default router;
