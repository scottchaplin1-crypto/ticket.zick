import { useEffect, useRef, useState } from "react";
import { ShieldBan, ScrollText, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import Toggle from "../components/Toggle.jsx";
import Tooltip from "../components/Tooltip.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

const ACTION_LABELS = {
  ban: { text: "Banned", color: "text-red-400" },
  kick: { text: "Kicked", color: "text-amber-400" },
  autoban: { text: "Auto-banned", color: "text-red-400" },
};

export default function Moderation({ guildId }) {
  const [form, setForm] = useState(null);
  const [channels, setChannels] = useState([]);
  const [cases, setCases] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { isDirty, setDirty } = useUnsavedChanges();
  const baselineRef = useRef(null);

  useEffect(() => {
    api.get(`/api/moderation/guild/${guildId}`).then((res) => {
      setForm(res.data);
      baselineRef.current = JSON.stringify(res.data);
    });
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
    api.get(`/api/moderation/guild/${guildId}/cases`).then((res) => setCases(res.data));
  }, [guildId]);

  useEffect(() => {
    if (!form) return;
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form]);

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const textChannels = channels.filter((c) => c.type === 0);

  function update(patch) {
    setForm({ ...form, ...patch });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      await api.put(`/api/moderation/guild/${guildId}`, form);
      baselineRef.current = JSON.stringify(form);
      setDirty(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Moderation</h1>
        {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <ShieldBan size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Settings</h3>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  Mod log channel
                  <Tooltip text="Every /ban, /kick, and auto-ban gets posted here with who did it, who it was, and why.">
                    <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                  </Tooltip>
                </span>
                <Select
                  value={form.modLogChannelId || ""}
                  onChange={(v) => update({ modLogChannelId: v })}
                  options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
                  placeholder="No channel (don't log)"
                />
              </label>

              <Toggle
                checked={form.autoBanEnabled}
                onChange={(v) => update({ autoBanEnabled: v })}
                label="Auto-ban new accounts that are too young"
              />
              {form.autoBanEnabled && (
                <>
                  <label className="block">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      Minimum account age (days)
                      <Tooltip text="Anyone whose Discord account is younger than this gets banned automatically the moment they join. Only affects new joins — never checks existing members.">
                        <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                      </Tooltip>
                    </span>
                    <input
                      type="number"
                      min={1}
                      className="input"
                      value={form.autoBanMinAgeDays}
                      onChange={(e) => update({ autoBanMinAgeDays: e.target.value })}
                    />
                  </label>
                  <p className="text-xs text-amber-400">
                    A common anti-raid trick — most raid/spam accounts are created minutes before joining.
                  </p>
                </>
              )}

              {saved && <p className="text-xs text-green-400">Saved.</p>}

              <button
                onClick={save}
                disabled={saving}
                className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <ScrollText size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Commands</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <p><code className="text-gray-200">/ban user reason</code> — accepts a mention or a raw Discord ID, so it works even on someone who isn't in the server.</p>
              <p><code className="text-gray-200">/kick user reason</code> — current members only.</p>
              <p className="text-xs text-gray-500 pt-1">
                Both are restricted to members with Discord's own Ban Members / Kick Members permission — Discord hides
                the commands entirely from anyone without it.
              </p>
            </div>
          </Card>
        </div>

        <Card title={`Recent actions (${cases.length})`}>
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {cases.map((c) => (
              <div key={c.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${ACTION_LABELS[c.action]?.color || "text-gray-300"}`}>
                    {ACTION_LABELS[c.action]?.text || c.action}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-300 mt-0.5">{c.targetTag || c.targetId}</p>
                {c.reason && <p className="text-xs text-gray-500 mt-0.5">{c.reason}</p>}
                <p className="text-xs text-gray-600 mt-0.5">
                  {c.moderatorId ? `by <@${c.moderatorId}>` : "automatic"}
                </p>
              </div>
            ))}
            {cases.length === 0 && <p className="text-sm text-gray-500">No moderation actions yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
