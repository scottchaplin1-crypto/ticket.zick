import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";

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
      <p className="text-gray-400 text-sm mb-4">
        Roles listed here automatically get access to every new ticket channel, and members with any of these roles
        can use staff-only actions like adding people to a ticket.
      </p>

      <div className="flex items-start gap-2.5 mb-6 px-4 py-3 rounded-lg bg-amber-400/10 border border-amber-400/20">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90 leading-relaxed">
          <strong>This list applies to every panel</strong> — adding a role here gives it access to tickets from all
          of them, not just one. If you only want a role added to a <em>specific</em> panel (e.g. a Billing team that
          shouldn't see general support tickets), don't add it here — instead go to that panel's settings and use{" "}
          <strong>"Which staff can access this panel's tickets"</strong> or{" "}
          <strong>"Other roles to ping"</strong> under <strong>Panels</strong> to scope it to just that one.
        </p>
      </div>

      <Card>
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <Select
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              options={availableRoles.map((r) => ({
                value: r.id,
                label: r.name,
                color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#99AAB5",
              }))}
              placeholder="Select a role…"
            />
          </div>
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
