import Stripe from "stripe";
import { prisma } from "./prisma.js";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Guild IDs that are always treated as subscribed, no Stripe involved at all —
// set via Render's environment, comma-separated, so this stays editable without
// a code change or redeploy.
const EXEMPT_GUILD_IDS = (process.env.EXEMPT_GUILD_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);

export function isExemptGuild(guildId) {
  return EXEMPT_GUILD_IDS.includes(guildId);
}

// The one function every paid-feature route will call once gating actually
// gets wired in — centralized here so "what counts as subscribed" is decided
// in exactly one place, not re-implemented per route.
export async function isGuildSubscribed(guildId) {
  if (isExemptGuild(guildId)) return true;
  const sub = await prisma.subscription.findUnique({ where: { guildId } });
  return sub?.status === "active" || sub?.status === "trialing";
}
