import { useEffect, useState } from "react";
import { Plus, Trash2, Trophy, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import Toggle from "../components/Toggle.jsx";
import Tooltip from "../components/Tooltip.jsx";
import SaveStatus from "../components/SaveStatus.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import { useAutoSave } from "../hooks/useAutoSave.js";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

const STAT_OPTIONS = [
  { value: "messages", label: "Messages sent" },
  { value: "reactions", label: "Reactions added" },
  { value: "threads", label: "Threads created" },
  { value: "boosts", label: "Server boosts" },
  { value: "roles_received", label: "Roles received" },
];

const BLANK = {
  name: "New Achievement",
  description: "",
  emoji: "🏆",
  color: "#FEE75C",
  statType: "messages",
  targetRoleId: "",
  enabled: true,
  announceChannelId: "",
  tiers: [],
};

// "roles_received" achievements need to specify exactly which role — encoded right
// into the stored statType string as "roles_received:<roleId>" so no database
// change was needed; these two helpers just translate that for the form.
function decomposeStatType(raw) {
  if (raw?.startsWith("roles_received:")) {
    return { statType: "roles_received", targetRoleId: raw.slice("roles_received:".length) };
  }
  return { statType: raw, targetRoleId: "" };
}
function composeStatType(statType, targetRoleId) {
  return statType === "roles_received" && targetRoleId ? `roles_received:${targetRoleId}` : statType;
}

export default function Achievements({ guildId }) {
  const [achievements, setAchievements] = useState([]);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const { requestNavigation } = useUnsavedChanges();

  function load() {
    return api.get(`/api/achievements/guild/${guildId}`).then((res) => {
      setAchievements(res.data);
      return res.data;
    });
  }

  useEffect(() => {
    load();
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
  }, [guildId]);

  const textChannels = channels.filter((c) => c.type === 0);

  function toPayload() {
    return { ...form, statType: composeStatType(form.statType, form.targetRoleId), tiers: JSON.stringify(form.tiers) };
  }

  function applySelection(a) {
    setSelected(a?.id ?? null);
    if (a) {
      const { statType, targetRoleId } = decomposeStatType(a.statType);
      setForm({ ...a, tiers: JSON.parse(a.tiers || "[]"), statType, targetRoleId });
    } else {
      setForm(BLANK);
    }
  }

  function select(a) {
    requestNavigation(() => applySelection(a));
  }
  function newAchievement() {
    requestNavigation(() => applySelection(null));
  }

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.post(`/api/achievements/guild/${guildId}`, toPayload());
      await load();
      applySelection(data);
    } finally {
      setSaving(false);
    }
  }

  const saveStatus = useAutoSave(form, () => api.patch(`/api/achievements/${selected}`, toPayload()).then(load), {
    enabled: !!selected,
    resetKey: selected,
  });

  async function remove() {
    if (!selected || !confirm("Delete this achievement? Members' progress toward it will also be forgotten.")) return;
    await api.delete(`/api/achievements/${selected}`);
    await load();
    applySelection(null);
  }

  function addTier() {
    setForm({ ...form, tiers: [...form.tiers, { name: `Tier ${form.tiers.length + 1}`, threshold: 10, roleId: "" }] });
  }
  function updateTier(i, key, value) {
    const tiers = [...form.tiers];
    tiers[i] = { ...tiers[i], [key]: value };
    setForm({ ...form, tiers });
  }
  function removeTier(i) {
    setForm({ ...form, tiers: form.tiers.filter((_, idx) => idx !== i) });
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <div className="flex items-center gap-4">
          {selected && <SaveStatus status={saveStatus} />}
          <button onClick={newAchievement} className="flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium">
            <Plus size={16} /> New Achievement
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Set your own milestones for messages, reactions, or threads — as many tiers as you like, each optionally
        granting a role. The bot tracks progress automatically and announces it when someone reaches a tier.
      </p>

      <div className="mb-6">
        <Select
          value={selected || ""}
          onChange={(id) => select(achievements.find((a) => a.id === id))}
          options={achievements.map((a) => ({ value: a.id, label: `${a.emoji} ${a.name}` }))}
          placeholder={achievements.length ? "Select an achievement…" : "No achievements yet — create one below"}
        />
      </div>

      <Card>
        <div className="space-y-3">
          <div className="grid grid-cols-[auto_1fr_auto] gap-3 items-end">
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Emoji</span>
              <EmojiPicker value={form.emoji} onChange={(v) => setForm({ ...form, emoji: v })} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Name</span>
              <input className="input" value={form.name} onChange={set("name")} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Placard color</span>
              <input type="color" className="input h-10 w-14 px-1" value={form.color} onChange={set("color")} />
            </label>
          </div>

          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Description</span>
            <textarea className="input" rows={2} value={form.description} onChange={set("description")} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Tracks
                <Tooltip text="Which activity counts toward this achievement's tiers.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <Select value={form.statType} onChange={(v) => setForm({ ...form, statType: v })} options={STAT_OPTIONS} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Announce in</span>
              <Select
                value={form.announceChannelId || ""}
                onChange={(v) => setForm({ ...form, announceChannelId: v })}
                options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
                placeholder="No channel (silent)"
              />
            </label>
          </div>

          {form.statType === "roles_received" && (
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Which role?
                <Tooltip text="Only receiving this specific role counts toward this achievement — not just any role.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <Select
                value={form.targetRoleId}
                onChange={(v) => setForm({ ...form, targetRoleId: v })}
                options={roles.map((r) => ({
                  value: r.id,
                  label: r.name,
                  color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#99AAB5",
                }))}
                placeholder="Select a role…"
              />
              {!form.targetRoleId && (
                <p className="text-xs text-amber-400 mt-1">Pick a role — without one, this achievement won't track anything.</p>
              )}
            </label>
          )}

          <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Enabled" />

          <div>
            <span className="block text-xs text-gray-400 mb-1.5">Tiers</span>
            <div className="space-y-2">
              {form.tiers.map((t, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface3 rounded-lg p-2">
                  <input
                    className="input h-9 text-sm flex-1"
                    placeholder="Tier name (e.g. Bronze)"
                    value={t.name}
                    onChange={(e) => updateTier(i, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    min={1}
                    className="input h-9 text-sm w-24"
                    placeholder="Threshold"
                    value={t.threshold}
                    onChange={(e) => updateTier(i, "threshold", parseInt(e.target.value) || 0)}
                  />
                  <div className="flex-1">
                    <Select
                      value={t.roleId || ""}
                      onChange={(v) => updateTier(i, "roleId", v)}
                      options={roles.map((r) => ({
                        value: r.id,
                        label: r.name,
                        color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#99AAB5",
                      }))}
                      placeholder="No role reward"
                    />
                  </div>
                  <button onClick={() => removeTier(i)} className="text-gray-500 hover:text-red-400 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.tiers.length === 0 && <p className="text-sm text-gray-500 italic">No tiers yet — add one below.</p>}
              <button
                onClick={addTier}
                className="w-full py-2 border border-dashed border-white/15 hover:border-cyan-400 hover:text-cyan-400 transition rounded-lg text-sm text-gray-400 flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add tier
              </button>
            </div>
          </div>

          {!selected && (
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create achievement"}
            </button>
          )}
          {selected && (
            <button onClick={remove} className="w-full py-2 text-red-400 text-sm hover:underline flex items-center justify-center gap-1.5">
              <Trash2 size={14} /> Delete achievement
            </button>
          )}
        </div>
      </Card>

      {selected && (
        <div className="mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-surface2 border border-white/5">
          <Trophy size={16} className="text-cyan-400 shrink-0" />
          <span className="text-sm text-gray-400">
            Editing <span className="text-white font-medium">{form.emoji} {form.name}</span> — tracks{" "}
            {STAT_OPTIONS.find((s) => s.value === form.statType)?.label.toLowerCase()}
          </span>
        </div>
      )}

      <Card title="Placard preview" actions={<span className="text-xs text-gray-500">What the unlock announcement looks like</span>}>
        <div className="bg-[#313338] rounded-lg p-4">
          <p className="text-gray-100 text-sm mb-2">
            GG <span className="text-blurple font-medium">@member</span>, you just unlocked the achievement:{" "}
            <strong>{form.name} ({form.tiers[0]?.name || "Tier"})</strong>! 🎉
          </p>
          <div className="border-l-4 rounded bg-black/20 p-3" style={{ borderColor: form.color }}>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Achievement Unlocked</p>
            <p className="text-white font-bold">{form.emoji} {form.name}</p>
            {form.description && <p className="text-gray-300 text-sm mt-1">{form.description}</p>}
            <p className="text-gray-500 text-xs mt-2">{form.tiers[0]?.name || "Tier"} tier</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
