import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

export default function StaffRoles({ guildId }) {
  const [roles, setRoles] = useState([]);
  const [discordRoles, setDiscordRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  function load() {
    api.get(`/api/customization/guild/${guildId}/staff-roles`).then((res) => setRoles(res.data));
  }
  useEffect(load, [guildId]);

  useEffect(() => {
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setDiscordRoles(res.data)).catch(() => setDiscordRoles([]));
  }, [guildId]);

  const addedRoleIds = new Set(roles.map((r) => r.roleId));
  const availableRoles = discordRoles.filter((r) => !addedRoleIds.has(r.id));

  async function add() {
    if (!selectedRoleId) return;
    const role = discordRoles.find((r) => r.id === selectedRoleId);
    if (!role) return;
    await api.post(`/api/customization/guild/${guildId}/staff-roles`, { roleId: role.id, roleName: role.name });
    setSelectedRoleId("");
    load();
  }

  async function remove(id) {
    await api.delete(`/api/customization/guild/${guildId}/staff-roles/${id}`);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Staff Roles</h1>
      <p className="text-gray-400 text-sm mb-6">
        Roles listed here automatically get access to every new ticket channel, and members with any of these roles
        can use staff-only actions like adding people to a ticket.
      </p>

      <Card>
        <div className="flex gap-2 mb-4">
          <select className="input flex-1" value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
            <option value="">Select a role…</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button onClick={add} disabled={!selectedRoleId} className="px-4 py-2 bg-blurple rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-50">
            Add
          </button>
        </div>
        {discordRoles.length === 0 && (
          <p className="text-xs text-gray-500 mb-4">
            Couldn't load your server's roles — make sure the bot is still in this server, then refresh.
          </p>
        )}

        <div className="divide-y divide-white/5">
          {roles.map((r) => (
            <div key={r.id} className="py-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: discordRoles.find((dr) => dr.id === r.roleId)?.color ? `#${discordRoles.find((dr) => dr.id === r.roleId).color.toString(16).padStart(6, "0")}` : "#99AAB5" }}
                />
                {r.roleName}
              </span>
              <button onClick={() => remove(r.roleId)} className="text-red-400 text-sm hover:underline">Remove</button>
            </div>
          ))}
          {roles.length === 0 && <p className="text-gray-500 text-sm">No staff roles added yet.</p>}
        </div>
      </Card>
    </div>
  );
}
