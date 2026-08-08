import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/guild/:guildId", requireAuth, async (req, res) => {
  const commands = await prisma.customCommand.findMany({ where: { guildId: req.params.guildId }, orderBy: { trigger: "asc" } });
  res.json(commands);
});

router.post("/guild/:guildId", requireAuth, async (req, res) => {
  try {
    const command = await prisma.customCommand.create({ data: { guildId: req.params.guildId, ...sanitize(req.body) } });
    res.json(command);
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "A command with that trigger already exists." });
    console.error(err);
    res.status(500).json({ error: "Couldn't create command." });
  }
});

router.patch("/:commandId", requireAuth, async (req, res) => {
  try {
    const command = await prisma.customCommand.update({ where: { id: req.params.commandId }, data: sanitize(req.body) });
    res.json(command);
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "A command with that trigger already exists." });
    console.error(err);
    res.status(500).json({ error: "Couldn't update command." });
  }
});

router.delete("/:commandId", requireAuth, async (req, res) => {
  await prisma.customCommand.delete({ where: { id: req.params.commandId } });
  res.json({ ok: true });
});

function sanitize(body) {
  const allowed = ["trigger", "embedTitle", "embedDescription", "embedColor", "embedImageUrl", "embedThumbnailUrl"];
  const out = {};
  for (const key of allowed) if (key in body) out[key] = body[key];
  if (out.trigger) out.trigger = out.trigger.trim().toLowerCase();
  return out;
}

export default router;
