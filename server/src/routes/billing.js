import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { stripe, isExemptGuild, isGuildSubscribed } from "../lib/stripe.js";

const router = Router();

router.get("/guild/:guildId/status", requireAuth, async (req, res) => {
  const { guildId } = req.params;
  if (isExemptGuild(guildId)) return res.json({ subscribed: true, exempt: true, status: "active" });

  const sub = await prisma.subscription.findUnique({ where: { guildId } });
  res.json({ subscribed: await isGuildSubscribed(guildId), exempt: false, status: sub?.status || "inactive" });
});

router.get("/bot/:guildId/status", requireBotSecret, async (req, res) => {
  res.json({ subscribed: await isGuildSubscribed(req.params.guildId) });
});

// Called right after Stripe redirects the customer back to the dashboard
// post-payment. No webhook involved — this asks Stripe directly, using just
// the Secret Key, whether the session actually completed and which guild it
// belongs to (client_reference_id, recorded by Stripe at the moment they
// clicked Upgrade). The guild ID is never trusted from the client — Stripe's
// own session data is the only source of truth for which server this payment
// was actually for.
router.post("/confirm", requireAuth, async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: "sessionId is required." });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

    const guildId = session.client_reference_id;
    if (!guildId) {
      return res.status(400).json({ error: "This payment isn't linked to a server — try upgrading again from that server's Billing page." });
    }
    if (session.status !== "complete") {
      return res.status(400).json({ error: "This payment hasn't completed yet — if you just paid, wait a moment and try again." });
    }

    const subscription = session.subscription;
    const status = subscription?.status || "active";

    await prisma.subscription.upsert({
      where: { guildId },
      create: { guildId, stripeCustomerId: session.customer, stripeSubscriptionId: subscription?.id || null, status },
      update: { stripeCustomerId: session.customer, stripeSubscriptionId: subscription?.id || null, status },
    });

    res.json({ ok: true, status, guildId });
  } catch (err) {
    console.error("billing confirm failed:", err.message);
    res.status(500).json({ error: "Couldn't confirm that payment. Refresh the billing page in a moment, or reach out if this keeps happening." });
  }
});

// A link to Stripe's own hosted "manage my subscription" page (update card,
// cancel, view invoices) — no custom billing UI needed, Stripe handles all of it.
router.get("/guild/:guildId/portal", requireAuth, async (req, res) => {
  const sub = await prisma.subscription.findUnique({ where: { guildId: req.params.guildId } });
  if (!sub?.stripeCustomerId) return res.status(400).json({ error: "No subscription found for this server yet." });

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: req.body.returnUrl || req.query.returnUrl,
    });
    res.json({ url: portalSession.url });
  } catch (err) {
    console.error("billing portal failed:", err.message);
    res.status(500).json({ error: "Couldn't open the billing portal right now." });
  }
});

// Checked periodically (not on every page load) — since there's no webhook
// telling us the moment someone cancels or a payment fails, this re-asks
// Stripe for each tracked subscription's current status so things don't stay
// stale forever if something changes on Stripe's side rather than through
// the dashboard.
export async function runSubscriptionStatusSweep() {
  const subs = await prisma.subscription.findMany({ where: { stripeSubscriptionId: { not: null } } });
  for (const sub of subs) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      if (stripeSub.status !== sub.status) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { status: stripeSub.status } });
      }
    } catch (err) {
      console.error(`Couldn't refresh subscription status for guild ${sub.guildId}:`, err.message);
    }
  }
}

export default router;
