import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Toggle from "../components/Toggle.jsx";

export default function QuickCommands({ guildId }) {
  const [form, setForm] = useState(null);
  const [panels, setPanels] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/api/guilds/${guildId}`).then((res) =>
      setForm({
        quickAddEnabled: res.data.quickAddEnabled,
        quickAddCommand: res.data.quickAddCommand,
        quickAddPanelId: res.data.quickAddPanelId || "",
      })
    );
    api.get(`/api/panels/guild/${guildId}`).then((res) => setPanels(res.data));
  }, [guildId]);

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function save() {
    setSaving(true);
    try {
      await api.put(`/api/guilds/${guildId}/quick-add`, form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Quick Commands</h1>
      <p className="text-gray-400 text-sm mb-6">
        Let staff open a ticket for someone by typing a short command in any channel — e.g.{" "}
        <code className="text-gray-300">{form.quickAddCommand || "$new"} @user</code> — instead of using the panel
        button. Only members with <strong>Manage Server</strong> or a configured Staff Role can use it.
      </p>

      <Card>
        <div className="space-y-4 max-w-md">
          <Toggle checked={form.quickAddEnabled} onChange={(v) => setForm({ ...form, quickAddEnabled: v })} label="Enable the quick-add command" />

          {form.quickAddEnabled && (
            <>
              <Field label="Command trigger">
                <input className="input" value={form.quickAddCommand} onChange={set("quickAddCommand")} placeholder="$new" />
              </Field>
              <p className="text-xs text-gray-500 -mt-2">
                Whatever you type here, staff will use it followed by a mention — e.g. if you set this to{" "}
                <code>!ticket</code>, they'd type <code>!ticket @someone</code>.
              </p>

              <Field label="Panel to use for quick tickets">
                <select className="input" value={form.quickAddPanelId} onChange={set("quickAddPanelId")}>
                  <option value="">Select a panel…</option>
                  {panels.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <p className="text-xs text-gray-500 -mt-2">
                Quick-added tickets use this panel's category, naming pattern, and transcript settings. Set up panels
                on the <strong>Panels</strong> tab first if the list is empty.
              </p>
            </>
          )}

          <button onClick={save} disabled={saving} className="w-full mt-2 py-2 bg-blurple rounded-lg font-medium disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}
