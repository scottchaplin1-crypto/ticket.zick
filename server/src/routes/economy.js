import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireBotSecret } from "../middleware/auth.js";
import { botApi } from "../lib/discord.js";

const router = Router();

// ---------- Config ----------

router.get("/guild/:guildId/config", requireAuth, async (req, res) => {
  const config = await prisma.economyConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config || { enabled: true, currencyName: "Coins", currencyEmoji: "🪙", collectionLogChannelId: null });
});

router.put("/guild/:guildId/config", requireAuth, async (req, res) => {
  const { enabled, currencyName, currencyEmoji, collectionLogChannelId } = req.body;
  const data = { enabled, currencyName, currencyEmoji, collectionLogChannelId: collectionLogChannelId || null };
  const config = await prisma.economyConfig.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });
  res.json(config);
});

// ---------- Store items (dashboard) ----------

router.get("/guild/:guildId/items", requireAuth, async (req, res) => {
  const items = await prisma.economyItem.findMany({ where: { guildId: req.params.guildId }, orderBy: { price: "asc" } });
  res.json(items);
});

router.post("/guild/:guildId/items", requireAuth, async (req, res) => {
  const item = await prisma.economyItem.create({ data: { guildId: req.params.guildId, ...sanitizeItem(req.body) } });
  res.json(item);
});

router.patch("/items/:id", requireAuth, async (req, res) => {
  const item = await prisma.economyItem.update({ where: { id: req.params.id }, data: sanitizeItem(req.body) });
  res.json(item);
});

router.delete("/items/:id", requireAuth, async (req, res) => {
  await prisma.economyItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

function sanitizeItem(body) {
  const allowed = ["name", "description", "emoji", "price", "limited", "roleId", "enabled"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  if ("price" in out) out.price = Math.max(0, parseInt(out.price, 10) || 0);
  if ("roleId" in out) out.roleId = out.roleId || null;
  return out;
}

// ---------- Balances & purchase history (dashboard visibility) ----------

router.get("/guild/:guildId/balances", requireAuth, async (req, res) => {
  const balances = await prisma.economyBalance.findMany({
    where: { guildId: req.params.guildId, balance: { gt: 0 } },
    orderBy: { balance: "desc" },
    take: 50,
  });

  const enriched = [];
  for (const b of balances) {
    let displayName = null;
    try {
      const { data } = await botApi.get(`/guilds/${req.params.guildId}/members/${b.userId}`);
      displayName = data.nick || data.user?.global_name || data.user?.username || null;
    } catch {
      displayName = null;
    }
    enriched.push({ ...b, displayName });
  }
  res.json(enriched);
});

router.get("/guild/:guildId/purchases", requireAuth, async (req, res) => {
  const purchases = await prisma.economyPurchase.findMany({
    where: { guildId: req.params.guildId },
    orderBy: { purchasedAt: "desc" },
    take: 50,
  });
  res.json(purchases);
});

// ---------- Bot-facing ----------

router.get("/bot/:guildId/config", requireBotSecret, async (req, res) => {
  const config = await prisma.economyConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config);
});

router.get("/bot/:guildId/items", requireBotSecret, async (req, res) => {
  const items = await prisma.economyItem.findMany({ where: { guildId: req.params.guildId, enabled: true }, orderBy: { price: "asc" } });
  res.json(items);
});

router.get("/bot/:guildId/balance/:userId", requireBotSecret, async (req, res) => {
  const balance = await prisma.economyBalance.findUnique({
    where: { guildId_userId: { guildId: req.params.guildId, userId: req.params.userId } },
  });
  res.json({ balance: balance?.balance || 0 });
});

// Adds (or subtracts, with a negative amount) currency for a member — used by
// admin grants now, and will be reused by earning-method hooks later.
router.post("/bot/:guildId/balance/:userId/add", requireBotSecret, async (req, res) => {
  const { amount } = req.body;
  const delta = parseInt(amount, 10) || 0;

  const existing = await prisma.economyBalance.findUnique({
    where: { guildId_userId: { guildId: req.params.guildId, userId: req.params.userId } },
  });
  const newBalance = Math.max(0, (existing?.balance || 0) + delta);

  const updated = await prisma.economyBalance.upsert({
    where: { guildId_userId: { guildId: req.params.guildId, userId: req.params.userId } },
    create: { guildId: req.params.guildId, userId: req.params.userId, balance: Math.max(0, delta) },
    update: { balance: newBalance },
  });
  res.json(updated);
});

// The actual purchase flow — validates funds and (for limited items) that the
// member doesn't already own it, deducts the balance, records the purchase, and
// returns everything the bot needs to announce it and grant a role if configured.
router.post("/bot/:guildId/purchase", requireBotSecret, async (req, res) => {
  const { userId, itemId } = req.body;
  const { guildId } = req.params;

  const item = await prisma.economyItem.findUnique({ where: { id: itemId } });
  if (!item || item.guildId !== guildId || !item.enabled) {
    return res.status(404).json({ error: "That item isn't available." });
  }

  if (item.limited) {
    const alreadyOwned = await prisma.economyPurchase.findFirst({ where: { guildId, userId, itemId } });
    if (alreadyOwned) {
      return res.status(400).json({ error: `You already own **${item.name}** — it's a one-per-person item.` });
    }
  }

  const balance = await prisma.economyBalance.findUnique({ where: { guildId_userId: { guildId, userId } } });
  const currentBalance = balance?.balance || 0;
  if (currentBalance < item.price) {
    return res.status(400).json({ error: `Not enough — **${item.name}** costs ${item.price}, you have ${currentBalance}.` });
  }

  await prisma.economyBalance.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, balance: currentBalance - item.price },
    update: { balance: currentBalance - item.price },
  });

  await prisma.economyPurchase.create({
    data: { guildId, userId, itemId: item.id, itemName: item.name, price: item.price },
  });

  const config = await prisma.economyConfig.findUnique({ where: { guildId } });

  res.json({
    ok: true,
    item: { name: item.name, emoji: item.emoji, roleId: item.roleId },
    newBalance: currentBalance - item.price,
    collectionLogChannelId: config?.collectionLogChannelId || null,
  });
});

export default router;
