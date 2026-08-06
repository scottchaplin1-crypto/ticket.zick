import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const config = await prisma.welcomeConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(
    config || {
      welcomeEnabled: false,
      welcomeChannelId: null,
      welcomeMessage: "Welcome {user} to {server}! We're now {membercount} members strong. 🎉",
      goodbyeEnabled: false,
      goodbyeChannelId: null,
      goodbyeMessage: "{username} has left {server}. We're now {membercount} members.",
    }
  );
});

router.put("/guild/:guildId", requireAuth, async (req, res) => {
  const { welcomeEnabled, welcomeChannelId, welcomeMessage, goodbyeEnabled, goodbyeChannelId, goodbyeMessage } = req.body;
  const data = { welcomeEnabled, welcomeChannelId, welcomeMessage, goodbyeEnabled, goodbyeChannelId, goodbyeMessage };
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

export default router;
