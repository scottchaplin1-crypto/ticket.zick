import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Toggle from "../components/Toggle.jsx";
import Select from "../components/Select.jsx";
import SaveStatus from "../components/SaveStatus.jsx";
import { useAutoSave } from "../hooks/useAutoSave.js";

export default function QuickCommands({ guildId }) {
  const [form, setForm] = useState(null);
  const [panels, setPanels] = useState([]);

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

  const status = useAutoSave(form, () => api.put(`/api/guilds/${guildId}/quick-add`, form), {
    enabled: !!form,
    resetKey: guildId,
  });

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const panelOptions = panels.map((p) => ({ value: p.id, label: p.name }));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Quick Commands</h1>
        <SaveStatus status={status} />
      </div>
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
                <Select
                  value={form.quickAddPanelId}
                  onChange={(v) => setForm({ ...form, quickAddPanelId: v })}
                  options={panelOptions}
                  placeholder="Select a panel…"
                />
              </Field>
              <p className="text-xs text-gray-500 -mt-2">
                Quick-added tickets use this panel's category, naming pattern, and transcript settings. Set up panels
                on the <strong>Panels</strong> tab first if the list is empty.
              </p>
            </>
          )}
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
