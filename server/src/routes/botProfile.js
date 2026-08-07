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

  const existing = await prisma.botProfile.findUnique({ where: { guildId: req.params.guildId } });

  const profile = await prisma.botProfile.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });

  // Discord rate-limits how often the avatar/banner specifically can change — so we
  // only re-send those when they've actually changed, not every time any field
  // (like the bio) gets saved. Otherwise editing the bio ten times would burn through
  // the same rate limit as changing the avatar ten times.
  const avatarChanged = !existing || existing.avatarUrl !== data.avatarUrl;
  const bannerChanged = !existing || existing.bannerUrl !== data.bannerUrl;

  try {
    const patchBody = { nick: data.nickname, bio: data.bio };
    if (avatarChanged) patchBody.avatar = await urlToDataUri(avatarUrl);
    if (bannerChanged) patchBody.banner = await urlToDataUri(bannerUrl);

    await botApi.patch(`/guilds/${req.params.guildId}/members/@me`, patchBody);
    res.json(profile);
  } catch (err) {
    console.error("Failed to push bot profile to Discord:", JSON.stringify(err.response?.data, null, 2) || err.message);

    const isAvatarRateLimit = err.response?.data?.errors?.avatar?._errors?.some((e) => e.code === "AVATAR_RATE_LIMIT");
    const isBannerRateLimit = err.response?.data?.errors?.banner?._errors?.some((e) => e.code === "AVATAR_RATE_LIMIT");

    const message =
      isAvatarRateLimit || isBannerRateLimit
        ? "Discord limits how often the avatar/banner can be changed — you're just changing it too fast while testing. This isn't a bug; wait a few minutes and it'll go through."
        : "Saved here, but couldn't update Discord — double check your image links point directly to an image file (not a webpage), and aren't too large.";

    res.status(207).json({ ...profile, discordWarning: message });
  }
});

export default router;
