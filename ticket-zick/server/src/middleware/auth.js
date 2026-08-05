import jwt from "jsonwebtoken";

// Verifies the dashboard's JWT (set as an httpOnly cookie after Discord OAuth login)
export function requireAuth(req, res, next) {
  const token = req.cookies?.tz_token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, username, avatar, accessToken }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

// Simple shared-secret check used by the bot when it calls the API
export function requireBotSecret(req, res, next) {
  const secret = req.headers["x-bot-secret"];
  if (secret !== process.env.DISCORD_BOT_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
