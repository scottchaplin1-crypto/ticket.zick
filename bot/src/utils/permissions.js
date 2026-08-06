import { PermissionFlagsBits } from "discord.js";
import { api } from "./api.js";

// Shared staff check: Manage Server permission, or membership in one of the
// guild's configured Staff Roles (set on the dashboard's Staff Roles page).
export async function isStaffMember(guildId, member) {
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  try {
    const { data } = await api.get(`/api/customization/bot/${guildId}/full`);
    const staffRoleIds = data.staffRoles.map((r) => r.roleId);
    return member.roles.cache.some((r) => staffRoleIds.includes(r.id));
  } catch {
    return false;
  }
}
