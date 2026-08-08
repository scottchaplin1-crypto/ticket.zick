import { api } from "../utils/api.js";

// Reactions on old messages may arrive as "partial" objects missing most data —
// this fills them in before we try to read anything off them.
async function resolveReaction(reaction) {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return null;
    }
  }
  return reaction;
}

function emojiKey(reactionEmoji) {
  // Custom server emojis are stored as "name:id" (matching what the dashboard's
  // emoji picker saves) — unicode emojis are just their character.
  return reactionEmoji.id ? `${reactionEmoji.name}:${reactionEmoji.id}` : reactionEmoji.name;
}

export async function handleReactionRoleButton(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const [, panelId, roleId] = interaction.customId.split(":");

  let panel;
  try {
    const { data } = await api.get(`/api/reaction-roles/bot/${panelId}`);
    panel = data;
  } catch {
    return interaction.editReply("This role panel couldn't be found — it may have been deleted.");
  }

  try {
    const member = interaction.member;
    const alreadyHasRole = member.roles.cache.has(roleId);

    if (alreadyHasRole) {
      // A second click on a role you already have removes it — the button
      // equivalent of un-reacting.
      await member.roles.remove(roleId);
      const role = interaction.guild.roles.cache.get(roleId);
      return interaction.editReply(`Removed **${role?.name || "the role"}**.`);
    }

    if (panel.mode === "single") {
      const mappings = JSON.parse(panel.mappings || "[]");
      const otherRoleIds = mappings.filter((m) => m.roleId !== roleId).map((m) => m.roleId);
      const toRemove = otherRoleIds.filter((id) => member.roles.cache.has(id));
      if (toRemove.length) await member.roles.remove(toRemove);
    }

    await member.roles.add(roleId);
    const role = interaction.guild.roles.cache.get(roleId);
    await interaction.editReply(`Added **${role?.name || "the role"}**! Click the same button again any time to remove it.`);
  } catch (err) {
    console.error("reaction role button failed:", err.code || err.message);
    await interaction.editReply("Couldn't update your roles — Ticket Zick may not have permission to manage this role.");
  }
}

export async function handleReactionAdd(reaction, user) {
  if (user.bot) return;
  const resolved = await resolveReaction(reaction);
  if (!resolved) return;

  let panel;
  try {
    const { data } = await api.get(`/api/reaction-roles/bot/by-message/${resolved.message.id}`);
    panel = data;
  } catch {
    return; // this message isn't a reaction-role panel — nothing to do
  }

  const mappings = JSON.parse(panel.mappings || "[]");
  const match = mappings.find((m) => m.emoji === emojiKey(resolved.emoji));
  if (!match) return;

  try {
    const guild = resolved.message.guild;
    const member = await guild.members.fetch(user.id);

    if (panel.mode === "single") {
      const otherRoleIds = mappings.filter((m) => m.roleId !== match.roleId).map((m) => m.roleId);
      const toRemove = otherRoleIds.filter((id) => member.roles.cache.has(id));
      if (toRemove.length) await member.roles.remove(toRemove);
    }

    await member.roles.add(match.roleId);
  } catch (err) {
    console.error("reaction role add failed:", err.code || err.message);
  }
}

export async function handleReactionRemove(reaction, user) {
  if (user.bot) return;
  const resolved = await resolveReaction(reaction);
  if (!resolved) return;

  let panel;
  try {
    const { data } = await api.get(`/api/reaction-roles/bot/by-message/${resolved.message.id}`);
    panel = data;
  } catch {
    return;
  }

  const mappings = JSON.parse(panel.mappings || "[]");
  const match = mappings.find((m) => m.emoji === emojiKey(resolved.emoji));
  if (!match) return;

  try {
    const guild = resolved.message.guild;
    const member = await guild.members.fetch(user.id);
    await member.roles.remove(match.roleId);
  } catch (err) {
    console.error("reaction role remove failed:", err.code || err.message);
  }
}
