import { isGuildSubscribed } from "../lib/stripe.js";

// Blocks a paid-feature route unless the guild has an active subscription (or is
// on the exempt list — isGuildSubscribed already handles that). Applied to both
// dashboard-facing and bot-facing routes for every paid feature, so someone
// can't bypass the paywall by hitting the bot commands directly even if the
// dashboard UI is also hiding the feature.
//
// getGuildId is usually just the param name holding the guild ID ("guildId" by
// default) — but some routes are keyed by something else (a panel ID, an item
// ID) and need a DB lookup first to find the guild, so this also accepts a
// function for those cases: requireSubscription(async (req) => { ... return guildId; })
export function requireSubscription(getGuildId = "guildId") {
  return async (req, res, next) => {
    try {
      const guildId = typeof getGuildId === "function" ? await getGuildId(req) : req.params[getGuildId];
      if (!guildId) return res.status(400).json({ error: "Missing guild context." });

      const subscribed = await isGuildSubscribed(guildId);
      if (!subscribed) {
        return res.status(402).json({
          error: "This feature is part of Ticket Zick Premium — upgrade on the Billing page to unlock it.",
          premiumRequired: true,
        });
      }
      next();
    } catch (err) {
      console.error("subscription check failed:", err.message);
      res.status(500).json({ error: "Couldn't verify subscription status right now." });
    }
  };
}
