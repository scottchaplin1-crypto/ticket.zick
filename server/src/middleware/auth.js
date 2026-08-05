import jwt from "jsonwebtoken";

// Verifies the dashboard's token, sent as `Authorization: Bearer <token>` on every
// request (see dashboard/src/api/client.js). We use a header instead of a cookie
// because the dashboard and this API live on different domains, and browsers block
// cross-site cookies unpredictably.
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
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
