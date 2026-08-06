import { Router } from "express";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const profile = await prisma.botProfile.findUnique({ where: { guildId: req.params.guildId } });
  res.json(profile || { nickname: "", avatarUrl: "", bannerUrl: "", bio: "" });
});

// Discord needs avatar/banner as base64 data, not a URL — this fetches whatever
// image the person linked and converts it, so the dashboard side can stay a
// simple "paste a link" field.
async function urlToDataUri(url) {
  if (!url) return null;
  const { data, headers } = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
  const mime = headers["content-type"]?.split(";")[0] || "image/png";
  return `data:${mime};base64,${Buffer.from(data).toString("base64")}`;
}

router.put("/guild/:guildId", requireAuth, async (req, res) => {
  const { nickname, avatarUrl, bannerUrl, bio } = req.body;
  const data = { nickname: nickname || null, avatarUrl: avatarUrl || null, bannerUrl: bannerUrl || null, bio: (bio || "").slice(0, 190) };

  const profile = await prisma.botProfile.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });

  try {
    const [avatarDataUri, bannerDataUri] = await Promise.all([urlToDataUri(avatarUrl), urlToDataUri(bannerUrl)]);
    await botApi.patch(`/guilds/${req.params.guildId}/members/@me`, {
      nick: data.nickname,
      avatar: avatarDataUri,
      banner: bannerDataUri,
      bio: data.bio,
    });
    res.json(profile);
  } catch (err) {
    console.error("Failed to push bot profile to Discord:", err.response?.data || err.message);
    // Saved locally either way — the dashboard shows this as a soft warning, not a hard failure.
    res.status(207).json({
      ...profile,
      discordWarning:
        "Saved here, but couldn't update Discord — double check your image links point directly to an image file (not a webpage), and aren't too large.",
    });
  }
});

export default router;
