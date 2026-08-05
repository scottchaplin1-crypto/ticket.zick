import { Router } from "express";
import jwt from "jsonwebtoken";
import { exchangeCode, getDiscordUser } from "../lib/discord.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Step 1: dashboard redirects the browser here... actually the dashboard builds
// the Discord authorize URL itself (see dashboard/src/pages/Login.jsx) and Discord
// redirects back to /auth/discord/callback below.

router.get("/discord/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenData = await exchangeCode(code);
    const discordUser = await getDiscordUser(tokenData.access_token);

    await prisma.user.upsert({
      where: { id: discordUser.id },
      create: {
        id: discordUser.id,
        username: discordUser.username,
        discriminator: discordUser.discriminator,
        avatar: discordUser.avatar,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      },
      update: {
        username: discordUser.username,
        avatar: discordUser.avatar,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
      },
    });

    const jwtToken = jwt.sign(
      {
        id: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar,
        accessToken: tokenData.access_token,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // We deliberately do NOT use a cookie here. The dashboard and this server live on
    // two different Render URLs, and modern browsers increasingly block cross-site
    // cookies outright (regardless of SameSite/Secure settings), which causes an
    // endless login loop. Instead we hand the token back via the URL, and the
    // dashboard stores it itself and sends it back as an Authorization header.
    const redirectUrl = new URL("/auth/callback", process.env.DASHBOARD_URL);
    redirectUrl.searchParams.set("token", jwtToken);
    res.redirect(redirectUrl.toString());
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Discord login failed");
  }
});

router.post("/logout", (req, res) => {
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ id: payload.id, username: payload.username, avatar: payload.avatar });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});

export default router;
