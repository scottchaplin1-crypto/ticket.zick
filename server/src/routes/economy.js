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
  const allowed = [
    "name", "description", "emoji", "price", "limited", "roleId", "enabled",
    "acquisitionType", "earnActivityType", "earnThreshold",
    "isMysteryBox", "mysteryBoxEligible", "weight",
  ];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  if ("price" in out) out.price = Math.max(0, parseInt(out.price, 10) || 0);
  if ("roleId" in out) out.roleId = out.roleId || null;
  if ("earnThreshold" in out) out.earnThreshold = out.earnThreshold ? Math.max(1, parseInt(out.earnThreshold, 10)) : null;
  if ("weight" in out) out.weight = Math.max(1, parseInt(out.weight, 10) || 10);
  if ("earnActivityType" in out) out.earnActivityType = out.earnActivityType || null;
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
  // Same defaults as the dashboard route — otherwise the economy silently
  // behaves as "off" for any server that hasn't explicitly hit Save yet, even
  // though the dashboard itself shows everything as enabled by default.
  res.json(config || { enabled: true, currencyName: "Coins", currencyEmoji: "🪙", collectionLogChannelId: null });
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
// Picks a random item from a weighted pool — each item's chance of being picked
// is its own weight divided by the total weight of everything in the pool. The
// simplest possible way to express rarity: no named tiers, just a relative number.
function weightedPick(pool) {
  const totalWeight = pool.reduce((sum, i) => sum + i.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1]; // floating-point edge case fallback
}

router.post("/bot/:guildId/purchase", requireBotSecret, async (req, res) => {
  const { userId, itemId } = req.body;
  const { guildId } = req.params;

  const item = await prisma.economyItem.findUnique({ where: { id: itemId } });
  if (!item || item.guildId !== guildId || !item.enabled) {
    return res.status(404).json({ error: "That item isn't available." });
  }
  if (item.acquisitionType === "earn") {
    return res.status(400).json({ error: `**${item.name}** can't be bought — it's earned by doing something specific in the server, not purchased.` });
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

  // Mystery box: deduct its own price, then hand over a different, weighted-random
  // item instead of the box itself.
  if (item.isMysteryBox) {
    const candidates = await prisma.economyItem.findMany({
      where: { guildId, enabled: true, isMysteryBox: false, mysteryBoxEligible: true, acquisitionType: "buy" },
    });

    // Limited items the person already owns can't be drawn again — everything
    // else (including a limited item they don't have yet) is fair game.
    const owned = new Set((await prisma.economyPurchase.findMany({ where: { guildId, userId } })).map((p) => p.itemId));
    const pool = candidates.filter((c) => !(c.limited && owned.has(c.id)));

    if (pool.length === 0) {
      return res.status(400).json({ error: "Nothing left to win from the mystery box right now — you already own everything eligible!" });
    }

    const won = weightedPick(pool);
    const isFirstTime = !owned.has(won.id);

    await prisma.economyBalance.update({ where: { guildId_userId: { guildId, userId } }, data: { balance: currentBalance - item.price } });
    await prisma.economyPurchase.create({ data: { guildId, userId, itemId: won.id, itemName: won.name, price: 0 } });

    const config = await prisma.economyConfig.findUnique({ where: { guildId } });
    return res.json({
      ok: true,
      wonFromMysteryBox: true,
      item: { name: won.name, emoji: won.emoji, roleId: won.roleId },
      newBalance: currentBalance - item.price,
      isFirstTime,
      collectionLogChannelId: config?.collectionLogChannelId || null,
    });
  }

  // Only the very first time someone gets a given item counts as a "collection
  // log" moment — repeat purchases of a re-buyable item are just a normal
  // transaction, not a new unlock.
  const priorPurchase = await prisma.economyPurchase.findFirst({ where: { guildId, userId, itemId } });
  const isFirstTime = !priorPurchase;

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
    isFirstTime,
    collectionLogChannelId: config?.collectionLogChannelId || null,
  });
});

// ---------- Work command (dashboard) ----------

router.get("/guild/:guildId/work-config", requireAuth, async (req, res) => {
  const config = await prisma.economyWorkConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config || { enabled: false, cooldownSeconds: 3600 });
});

router.put("/guild/:guildId/work-config", requireAuth, async (req, res) => {
  const { enabled, cooldownSeconds } = req.body;
  const data = { enabled, cooldownSeconds: Math.max(0, parseInt(cooldownSeconds, 10) || 0) };
  const config = await prisma.economyWorkConfig.upsert({
    where: { guildId: req.params.guildId },
    create: { guildId: req.params.guildId, ...data },
    update: data,
  });
  res.json(config);
});

router.get("/guild/:guildId/work-outcomes", requireAuth, async (req, res) => {
  const outcomes = await prisma.economyWorkOutcome.findMany({ where: { guildId: req.params.guildId }, orderBy: { weight: "desc" } });
  res.json(outcomes);
});

router.post("/guild/:guildId/work-outcomes", requireAuth, async (req, res) => {
  const outcome = await prisma.economyWorkOutcome.create({ data: { guildId: req.params.guildId, ...sanitizeOutcome(req.body) } });
  res.json(outcome);
});

router.patch("/work-outcomes/:id", requireAuth, async (req, res) => {
  const outcome = await prisma.economyWorkOutcome.update({ where: { id: req.params.id }, data: sanitizeOutcome(req.body) });
  res.json(outcome);
});

router.delete("/work-outcomes/:id", requireAuth, async (req, res) => {
  await prisma.economyWorkOutcome.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

function sanitizeOutcome(body) {
  const allowed = ["label", "weight", "currencyAmount", "itemId", "enabled"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  if ("weight" in out) out.weight = Math.max(1, parseInt(out.weight, 10) || 10);
  if ("currencyAmount" in out) out.currencyAmount = out.currencyAmount === "" || out.currencyAmount == null ? null : Math.max(0, parseInt(out.currencyAmount, 10) || 0);
  if ("itemId" in out) out.itemId = out.itemId || null;
  return out;
}

// ---------- Work command (bot) ----------

router.get("/bot/:guildId/work-config", requireBotSecret, async (req, res) => {
  const config = await prisma.economyWorkConfig.findUnique({ where: { guildId: req.params.guildId } });
  res.json(config || { enabled: false, cooldownSeconds: 3600 });
});

router.post("/bot/:guildId/work", requireBotSecret, async (req, res) => {
  const { userId } = req.body;
  const { guildId } = req.params;

  const config = await prisma.economyWorkConfig.findUnique({ where: { guildId } });
  if (!config?.enabled) return res.status(400).json({ error: "Working isn't set up on this server yet." });

  const cooldown = await prisma.economyCooldown.findUnique({ where: { guildId_userId_type: { guildId, userId, type: "work" } } });
  if (cooldown) {
    const remainingMs = config.cooldownSeconds * 1000 - (Date.now() - new Date(cooldown.lastEarnedAt).getTime());
    if (remainingMs > 0) {
      const mins = Math.ceil(remainingMs / 60000);
      return res.status(400).json({ error: `You're still tired from last time — try again in about ${mins} minute${mins === 1 ? "" : "s"}.` });
    }
  }

  const outcomes = await prisma.economyWorkOutcome.findMany({ where: { guildId, enabled: true } });
  if (outcomes.length === 0) return res.status(400).json({ error: "No work outcomes have been set up yet." });

  const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * totalWeight;
  let picked = outcomes[outcomes.length - 1];
  for (const o of outcomes) {
    roll -= o.weight;
    if (roll <= 0) {
      picked = o;
      break;
    }
  }

  await prisma.economyCooldown.upsert({
    where: { guildId_userId_type: { guildId, userId, type: "work" } },
    create: { guildId, userId, type: "work", lastEarnedAt: new Date() },
    update: { lastEarnedAt: new Date() },
  });

  const eco = await prisma.economyConfig.findUnique({ where: { guildId } });

  if (picked.itemId) {
    const item = await prisma.economyItem.findUnique({ where: { id: picked.itemId } });
    if (!item || !item.enabled) {
      return res.json({ ok: true, label: picked.label, currencyAmount: 0 }); // item got deleted/disabled since — just a dud roll
    }
    if (item.limited) {
      const alreadyOwned = await prisma.economyPurchase.findFirst({ where: { guildId, userId, itemId: item.id } });
      if (alreadyOwned) {
        return res.json({ ok: true, label: picked.label, currencyAmount: 0 }); // already own it — dud roll rather than a duplicate
      }
    }
    const isFirstTime = !(await prisma.economyPurchase.findFirst({ where: { guildId, userId, itemId: item.id } }));
    await prisma.economyPurchase.create({ data: { guildId, userId, itemId: item.id, itemName: item.name, price: 0 } });
    return res.json({
      ok: true,
      item: { name: item.name, emoji: item.emoji, roleId: item.roleId },
      isFirstTime,
      collectionLogChannelId: eco?.collectionLogChannelId || null,
    });
  }

  const amount = picked.currencyAmount || 0;
  let newBalance = 0;
  if (amount > 0) {
    const balance = await prisma.economyBalance.upsert({
      where: { guildId_userId: { guildId, userId } },
      create: { guildId, userId, balance: amount },
      update: { balance: { increment: amount } },
    });
    newBalance = balance.balance;
  }

  res.json({ ok: true, label: picked.label, currencyAmount: amount, newBalance });
});

const EARN_TYPES = ["message", "reaction", "thread", "gif"];

// ---------- Earning rules (dashboard) ----------

router.get("/guild/:guildId/earn-rules", requireAuth, async (req, res) => {
  const rows = await prisma.economyEarnRule.findMany({ where: { guildId: req.params.guildId } });
  const byType = Object.fromEntries(rows.map((r) => [r.type, r]));
  // Always return all four types, even ones never configured yet, so the
  // dashboard has something sensible to show right away.
  const full = EARN_TYPES.map((type) => byType[type] || { type, enabled: false, amount: 1, cooldownSeconds: 60 });
  res.json(full);
});

router.put("/guild/:guildId/earn-rules/:type", requireAuth, async (req, res) => {
  const { type } = req.params;
  if (!EARN_TYPES.includes(type)) return res.status(400).json({ error: "Unknown earning type." });

  const { enabled, amount, cooldownSeconds } = req.body;
  const data = {
    enabled,
    amount: Math.max(0, parseInt(amount, 10) || 0),
    cooldownSeconds: Math.max(0, parseInt(cooldownSeconds, 10) || 0),
  };
  const rule = await prisma.economyEarnRule.upsert({
    where: { guildId_type: { guildId: req.params.guildId, type } },
    create: { guildId: req.params.guildId, type, ...data },
    update: data,
  });
  res.json(rule);
});

// ---------- Bot-facing: the actual earn check ----------

// Checks whether this action just crossed the threshold for any "earn"-type item
// of this activity type, and grants it automatically (once) if so.
async function checkEarnItemUnlocks(guildId, userId, type, currentCount) {
  const earnableItems = await prisma.economyItem.findMany({
    where: { guildId, enabled: true, acquisitionType: "earn", earnActivityType: type, earnThreshold: { lte: currentCount } },
  });
  if (earnableItems.length === 0) return [];

  const config = await prisma.economyConfig.findUnique({ where: { guildId } });
  const unlocked = [];
  for (const item of earnableItems) {
    const alreadyOwned = await prisma.economyPurchase.findFirst({ where: { guildId, userId, itemId: item.id } });
    if (alreadyOwned) continue;
    await prisma.economyPurchase.create({ data: { guildId, userId, itemId: item.id, itemName: item.name, price: 0 } });
    unlocked.push({ name: item.name, emoji: item.emoji, roleId: item.roleId, collectionLogChannelId: config?.collectionLogChannelId || null });
  }
  return unlocked;
}

router.post("/bot/:guildId/earn", requireBotSecret, async (req, res) => {
  const { userId, type } = req.body;
  const { guildId } = req.params;

  // The cumulative count always increments — "earn"-type items check against
  // this, independent of whether currency-earning is even turned on below.
  const countRow = await prisma.economyActivityCount.upsert({
    where: { guildId_userId_type: { guildId, userId, type } },
    create: { guildId, userId, type, count: 1 },
    update: { count: { increment: 1 } },
  });
  const unlocked = await checkEarnItemUnlocks(guildId, userId, type, countRow.count);

  const rule = await prisma.economyEarnRule.findUnique({ where: { guildId_type: { guildId, type } } });
  if (!rule || !rule.enabled || rule.amount <= 0) return res.json({ earned: false, unlocked });

  const cooldown = await prisma.economyCooldown.findUnique({ where: { guildId_userId_type: { guildId, userId, type } } });
  if (cooldown && Date.now() - new Date(cooldown.lastEarnedAt).getTime() < rule.cooldownSeconds * 1000) {
    return res.json({ earned: false, unlocked }); // still on cooldown for this activity type
  }

  await prisma.economyCooldown.upsert({
    where: { guildId_userId_type: { guildId, userId, type } },
    create: { guildId, userId, type, lastEarnedAt: new Date() },
    update: { lastEarnedAt: new Date() },
  });

  const balance = await prisma.economyBalance.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: { guildId, userId, balance: rule.amount },
    update: { balance: { increment: rule.amount } },
  });

  res.json({ earned: true, amount: rule.amount, newBalance: balance.balance, unlocked });
});

export default router;
