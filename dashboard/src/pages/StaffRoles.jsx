import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

export default function StaffRoles({ guildId }) {
  const [roles, setRoles] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [roleName, setRoleName] = useState("");

  function load() {
    api.get(`/api/customization/guild/${guildId}/staff-roles`).then((res) => setRoles(res.data));
  }
  useEffect(load, [guildId]);

  async function add() {
    if (!roleId || !roleName) return;
    await api.post(`/api/customization/guild/${guildId}/staff-roles`, { roleId, roleName });
    setRoleId("");
    setRoleName("");
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
        Roles listed here automatically get access to every new ticket channel. Find the Role ID via Discord's
        developer mode (right-click a role → Copy Role ID).
      </p>

      <Card>
        <div className="flex gap-2 mb-4">
          <input className="input" placeholder="Role ID" value={roleId} onChange={(e) => setRoleId(e.target.value)} />
          <input className="input" placeholder="Role name (label only)" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
          <button onClick={add} className="px-4 py-2 bg-blurple rounded-lg text-sm font-medium whitespace-nowrap">Add</button>
        </div>

        <div className="divide-y divide-white/5">
          {roles.map((r) => (
            <div key={r.id} className="py-2 flex items-center justify-between">
              <span>{r.roleName} <span className="text-gray-500 text-xs">({r.roleId})</span></span>
              <button onClick={() => remove(r.roleId)} className="text-red-400 text-sm hover:underline">Remove</button>
            </div>
          ))}
          {roles.length === 0 && <p className="text-gray-500 text-sm">No staff roles added yet.</p>}
        </div>
      </Card>
    </div>
  );
}
