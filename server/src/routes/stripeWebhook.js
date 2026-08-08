import { Router } from "express";
import { stripe } from "../lib/stripe.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Stripe pushes events here the instant something changes on their side —
// a subscription renewing, lapsing, or being cancelled — instead of us having
// to wait for the periodic sweep to notice. req.body is the RAW, unparsed
// request here on purpose (see index.js, where this router is mounted before
// the normal JSON parser) — Stripe's signature check needs the exact original
// bytes, and a parsed-then-re-stringified object won't match.
router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Signature didn't check out — either a misconfigured secret, or someone
    // other than Stripe trying to fake an event. Reject it either way.
    console.error("Stripe webhook signature check failed:", err.message);
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    switch (event.type) {
      // A subscription's status changed — renewed, payment failed, cancelled,
      // reactivated, etc. This is the main event that makes the whole point of
      // having a webhook: catching this the instant it happens, not up to 15
      // minutes later.
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const existing = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: subscription.id } });
        if (existing) {
          await prisma.subscription.update({ where: { id: existing.id }, data: { status: subscription.status } });
        }
        break;
      }

      // Belt-and-suspenders alongside the direct confirm-on-redirect flow —
      // covers the case where someone pays but closes the tab before the
      // redirect back to the dashboard actually completes.
      case "checkout.session.completed": {
        const session = event.data.object;
        const guildId = session.client_reference_id;
        if (guildId && session.subscription) {
          await prisma.subscription.upsert({
            where: { guildId },
            create: { guildId, stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription, status: "active" },
            update: { stripeCustomerId: session.customer, stripeSubscriptionId: session.subscription, status: "active" },
          });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook handler failed:", err.message);
    // Returning an error tells Stripe to retry this event later, rather than
    // silently losing it if something (e.g. the database) hiccuped.
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
