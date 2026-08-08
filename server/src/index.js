import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./lib/prisma.js";
import { isGuildSubscribed } from "./lib/stripe.js";

import authRoutes from "./routes/auth.js";
import guildRoutes from "./routes/guilds.js";
import panelRoutes from "./routes/panels.js";
import ticketRoutes from "./routes/tickets.js";
import customizationRoutes from "./routes/customization.js";
import welcomeRoutes from "./routes/welcome.js";
import reactionRoleRoutes from "./routes/reactionRoles.js";
import customCommandRoutes from "./routes/customCommands.js";
import botProfileRoutes from "./routes/botProfile.js";
import embedMessageRoutes from "./routes/embedMessages.js";
// Achievements route intentionally not mounted right now — the underlying tracking
// call on every message/reaction added too much background load for the moment.
// The route file, bot handler, and database tables are all still there, untouched,
// so turning it back on later is just re-adding a few lines, not rebuilding.
// import achievementRoutes from "./routes/achievements.js";
import osrsSyncRoutes, { syncGuildRoles } from "./routes/osrsSync.js";
import moderationRoutes from "./routes/moderation.js";
import autoMessageRoutes, { runAutoMessageSweep } from "./routes/autoMessages.js";
import economyRoutes from "./routes/economy.js";
import giveawayRoutes, { runGiveawaySweep } from "./routes/giveaways.js";
import pollRoutes, { runPollSweep } from "./routes/polls.js";
import billingRoutes, { runSubscriptionStatusSweep } from "./routes/billing.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: process.env.DASHBOARD_URL, credentials: true }));

// This one route needs the untouched raw request body to verify Stripe's
// signature — it MUST be registered here, before express.json() below, or the
// body will already be parsed into an object by the time it gets here and
// signature verification will fail every time.
app.use("/api/stripe-webhook", express.raw({ type: "application/json" }), stripeWebhookRoutes);

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/auth", authRoutes);
app.use("/api/guilds", guildRoutes);
app.use("/api/panels", panelRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/customization", customizationRoutes);
app.use("/api/welcome", welcomeRoutes);
app.use("/api/reaction-roles", reactionRoleRoutes);
app.use("/api/custom-commands", customCommandRoutes);
app.use("/api/bot-profile", botProfileRoutes);
app.use("/api/embed-messages", embedMessageRoutes);
// app.use("/api/achievements", achievementRoutes);
app.use("/api/osrs-sync", osrsSyncRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/auto-messages", autoMessageRoutes);
app.use("/api/economy", economyRoutes);
app.use("/api/giveaways", giveawayRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/billing", billingRoutes);

app.get("/health", (req, res) => res.json({ ok: true, name: "Ticket Zick API" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Ticket Zick API running on http://localhost:${PORT}`));

// Every 30 minutes, re-check every server with OSRS sync enabled and update
// Discord roles for anyone whose in-game clan rank has changed since last check.
const OSRS_SYNC_INTERVAL_MS = 30 * 60 * 1000;
async function runOsrsSyncForAllGuilds() {
  try {
    const configs = await prisma.osrsSyncConfig.findMany({ where: { enabled: true }, select: { guildId: true } });
    for (const { guildId } of configs) {
      // Runs on a timer with no request to gate — without this check, sync set
      // up while subscribed would just keep running forever even after the
      // subscription lapsed.
      if (!(await isGuildSubscribed(guildId))) continue;
      await syncGuildRoles(guildId).catch((err) => console.error(`OSRS sync failed for guild ${guildId}:`, err.message));
    }
  } catch (err) {
    console.error("OSRS sync sweep failed:", err.message);
  }
}
setInterval(runOsrsSyncForAllGuilds, OSRS_SYNC_INTERVAL_MS);

// Checked every minute — Auto Messages can have intervals as short as a minute,
// so this needs to run more frequently than the 30-minute OSRS sweep above.
setInterval(() => {
  runAutoMessageSweep().catch((err) => console.error("Auto message sweep failed:", err.message));
}, 60 * 1000);

setInterval(() => {
  runGiveawaySweep().catch((err) => console.error("Giveaway sweep failed:", err.message));
}, 60 * 1000);

setInterval(() => {
  runPollSweep().catch((err) => console.error("Poll sweep failed:", err.message));
}, 60 * 1000);

// The Billing page itself now checks Stripe live (see the /status route), so
// this sweep mainly matters for keeping OTHER gated features (bot commands,
// other dashboard pages) reasonably fresh in between. 15 minutes balances
// staleness against not hammering Stripe's API unnecessarily.
setInterval(() => {
  runSubscriptionStatusSweep().catch((err) => console.error("Subscription status sweep failed:", err.message));
}, 15 * 60 * 1000);
