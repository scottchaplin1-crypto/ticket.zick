import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Send, CheckCircle2, Smile, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import Tooltip from "../components/Tooltip.jsx";
import Select from "../components/Select.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

const BLANK = {
  name: "New Reaction Roles",
  title: "Choose your roles",
  description: "React below to get a role!",
  color: "#5865F2",
  mode: "multiple",
  mappings: [],
};

const CREATE_ROLE_VALUE = "__create__";

// Mapping emojis can be a plain unicode character or a custom server emoji stored
// as "name:id" — this renders whichever it is correctly in the preview.
function EmojiDisplay({ value, className = "" }) {
  const customMatch = (value || "").match(/^([\w~]+):(\d{15,21})$/);
  if (customMatch) {
    return <img src={`https://cdn.discordapp.com/emojis/${customMatch[2]}.png?size=32`} className={`inline-block w-5 h-5 ${className}`} alt="" />;
  }
  return <span className={className}>{value}</span>;
}

export default function ReactionRoles({ guildId }) {
  const [panels, setPanels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendChannelId, setSendChannelId] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const [creatingForIndex, setCreatingForIndex] = useState(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#5865F2");
  const [creatingRole, setCreatingRole] = useState(false);
  const [createRoleError, setCreateRoleError] = useState("");
  const baselineRef = useRef(JSON.stringify(BLANK));

  function load() {
    return api.get(`/api/reaction-roles/guild/${guildId}`).then((res) => {
      setPanels(res.data);
      return res.data;
    });
  }

  useEffect(() => {
    load();
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
  }, [guildId]);

  const textChannels = channels.filter((c) => c.type === 0);

  // The actual state change, with no guard — used by the guarded public
  // select()/newPanel() below AND right after a successful create, where there's
  // nothing to "discard" so routing that through the guard would be a bug.
  function applySelection(panel) {
    setSelected(panel?.id ?? null);
    const data = panel ? { ...panel, mappings: JSON.parse(panel.mappings || "[]") } : BLANK;
    setForm(data);
    baselineRef.current = JSON.stringify(data);
    setSendChannelId("");
    setSendResult(null);
  }

  function select(panel) {
    requestNavigation(() => applySelection(panel));
  }

  function newPanel() {
    requestNavigation(() => applySelection(null));
  }

  function toPayload() {
    return { ...form, mappings: JSON.stringify(form.mappings) };
  }

  async function save() {
    setSaving(true);
    try {
      if (selected) {
        await api.patch(`/api/reaction-roles/${selected}`, toPayload());
        await load();
        baselineRef.current = JSON.stringify(form);
        setDirty(false);
      } else {
        const { data } = await api.post(`/api/reaction-roles/guild/${guildId}`, toPayload());
        await load();
        applySelection(data);
      }
    } finally {
      setSaving(false);
    }
  }

  // Dirty means "differs from whatever was last loaded or saved" — same idea
  // whether this is a brand new panel or an existing one being edited.
  const { isDirty, setDirty, requestNavigation } = useUnsavedChanges();
  useEffect(() => {
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form]);

  async function remove() {
    if (!selected || !confirm("Delete this reaction role panel?")) return;
    await api.delete(`/api/reaction-roles/${selected}`);
    await load();
    newPanel();
  }

  async function sendPanel() {
    if (!selected || !sendChannelId) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post(`/api/reaction-roles/${selected}/send`, { channelId: sendChannelId });
      await load();
      setSendResult({ ok: true, message: `Sent to #${textChannels.find((c) => c.id === sendChannelId)?.name}` });
    } catch (err) {
      setSendResult({ ok: false, message: err.response?.data?.error || "Couldn't send the panel." });
    } finally {
      setSending(false);
    }
  }

  function addMapping() {
    setForm({ ...form, mappings: [...form.mappings, { emoji: "⭐", roleId: "", label: "" }] });
  }
  function updateMapping(i, key, value) {
    const mappings = [...form.mappings];
    mappings[i] = { ...mappings[i], [key]: value };
    setForm({ ...form, mappings });
  }
  function removeMapping(i) {
    setForm({ ...form, mappings: form.mappings.filter((_, idx) => idx !== i) });
  }

  function openCreateRole(i) {
    setCreatingForIndex(i);
    setNewRoleName("");
    setNewRoleColor("#5865F2");
    setCreateRoleError("");
  }

  async function createRole() {
    if (!newRoleName.trim()) {
      setCreateRoleError("Give the role a name first.");
      return;
    }
    setCreatingRole(true);
    setCreateRoleError("");
    try {
      const { data: newRole } = await api.post(`/api/guilds/${guildId}/roles`, { name: newRoleName, color: newRoleColor });
      setRoles((r) => [...r, newRole]);
      updateMapping(creatingForIndex, "roleId", newRole.id);
      setCreatingForIndex(null);
    } catch (err) {
      setCreateRoleError(err.response?.data?.error || "Couldn't create the role.");
    } finally {
      setCreatingRole(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const roleOptions = [
    ...roles.map((r) => ({
      value: r.id,
      label: r.name,
      color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#99AAB5",
    })),
    { value: CREATE_ROLE_VALUE, label: "+ Create a new role…", accent: true },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reaction Roles</h1>
        <div className="flex items-center gap-4">
          {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
          <button onClick={newPanel} className="flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium">
            <Plus size={16} /> New Panel
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              p.id === selected ? "bg-cyan-500 text-[#0b1416] shadow-lg shadow-cyan-500/25" : "bg-surface2 hover:bg-surface3 text-gray-300"
            }`}
          >
            {p.name}
          </button>
        ))}
        {panels.length === 0 && <p className="text-sm text-gray-500">No reaction role panels yet.</p>}
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <Card title="Configuration">
            <div className="space-y-3">
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  Panel name (internal)
                  <Tooltip text="Only shown here in the dashboard — never visible in Discord.">
                    <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                  </Tooltip>
                </span>
                <input className="input" value={form.name} onChange={set("name")} />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Embed title</span>
                <input className="input" value={form.title} onChange={set("title")} />
              </label>
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Embed description</span>
                <textarea className="input" rows={2} value={form.description} onChange={set("description")} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Color</span>
                  <input type="color" className="input h-10" value={form.color} onChange={set("color")} />
                </label>
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    Mode
                    <Tooltip text="Multiple: people can react to as many as they like, holding several roles at once. Single: reacting to a new one automatically removes whichever they had before from this same panel.">
                      <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                    </Tooltip>
                  </span>
                  <Select
                    value={form.mode}
                    onChange={(v) => setForm({ ...form, mode: v })}
                    options={[
                      { value: "multiple", label: "Multiple — can hold several at once" },
                      { value: "single", label: "Single — picking one removes the others" },
                    ]}
                  />
                </label>
              </div>
            </div>
          </Card>

          <Card title="Role mappings">
            <div className="space-y-2">
              {form.mappings.map((m, i) => (
                <div key={i} className="bg-surface3 rounded-lg p-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <EmojiPicker guildId={guildId} value={m.emoji} onChange={(v) => updateMapping(i, "emoji", v)} />
                    <div className="flex-1">
                      <Select
                        value={m.roleId}
                        onChange={(v) => (v === CREATE_ROLE_VALUE ? openCreateRole(i) : updateMapping(i, "roleId", v))}
                        options={roleOptions}
                        placeholder="Select a role…"
                      />
                    </div>
                    <input
                      className="input h-10 flex-1"
                      placeholder="Label (optional)"
                      value={m.label}
                      onChange={(e) => updateMapping(i, "label", e.target.value)}
                    />
                    <button onClick={() => removeMapping(i)} className="text-gray-500 hover:text-red-400 transition shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {creatingForIndex === i && (
                    <div className="flex items-center gap-2 pl-[4.5rem] pt-1 border-t border-white/5">
                      <input
                        className="input h-9 text-sm flex-1"
                        placeholder="New role name"
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        autoFocus
                      />
                      <input
                        type="color"
                        className="input h-9 w-14 shrink-0 px-1"
                        value={newRoleColor}
                        onChange={(e) => setNewRoleColor(e.target.value)}
                      />
                      <button
                        onClick={createRole}
                        disabled={creatingRole}
                        className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] transition rounded-lg text-xs font-medium disabled:opacity-50 shrink-0"
                      >
                        {creatingRole ? "Creating…" : "Create"}
                      </button>
                      <button
                        onClick={() => setCreatingForIndex(null)}
                        className="text-gray-500 hover:text-gray-300 text-xs shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {creatingForIndex === i && createRoleError && (
                    <p className="text-xs text-red-400 pl-[4.5rem]">{createRoleError}</p>
                  )}
                </div>
              ))}
              {form.mappings.length === 0 && <p className="text-sm text-gray-500 italic">No roles mapped yet.</p>}
              <button
                onClick={addMapping}
                className="w-full py-2 border border-dashed border-white/15 hover:border-cyan-400 hover:text-cyan-400 transition rounded-lg text-sm text-gray-400 flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add role
              </button>
            </div>
          </Card>

          <button
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : selected ? "Save changes" : "Create panel"}
          </button>
          {selected && (
            <button onClick={remove} className="w-full py-2 text-red-400 text-sm hover:underline flex items-center justify-center gap-1.5">
              <Trash2 size={14} /> Delete panel
            </button>
          )}

          {selected && (
            <div className="bg-surface2 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Send size={15} className="text-cyan-400" />
                <h3 className="font-semibold text-gray-200 text-sm">Send to Discord</h3>
              </div>
              <p className="text-xs text-gray-500">Posts the panel and adds every mapped emoji as a reaction automatically.</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={sendChannelId}
                    onChange={setSendChannelId}
                    options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
                    placeholder="Select a channel…"
                  />
                </div>
                <button
                  onClick={sendPanel}
                  disabled={!sendChannelId || sending || form.mappings.length === 0}
                  className="px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium disabled:opacity-40 whitespace-nowrap"
                >
                  {sending ? "Sending…" : "Send"}
                </button>
              </div>
              {sendResult && (
                <p className={`text-xs flex items-center gap-1.5 ${sendResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {sendResult.ok && <CheckCircle2 size={12} />}
                  {sendResult.message}
                </p>
              )}
              {form.channelId && !sendResult && (
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-400" />
                  Currently posted in #{textChannels.find((c) => c.id === form.channelId)?.name || "a channel"}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="sticky top-6">
          <Card title="Live preview">
            <div className="bg-[#313338] rounded-lg p-4 border-l-4" style={{ borderColor: form.color }}>
              <p className="font-bold text-white">{form.title}</p>
              <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{form.description}</p>
              {form.mappings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {form.mappings.map((m, i) => (
                    <p key={i} className="text-gray-300 text-sm flex items-center gap-2">
                      <EmojiDisplay value={m.emoji} />
                      <span>—</span>
                      <span>{m.label || roles.find((r) => r.id === m.roleId)?.name || "Role"}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {form.mappings.map((m, i) => (
                  <span key={i} className="w-8 h-8 rounded-full bg-surface3 flex items-center justify-center text-sm">
                    <EmojiDisplay value={m.emoji} />
                  </span>
                ))}
                {form.mappings.length === 0 && (
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Smile size={12} /> Add role mappings to see reactions here
                  </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
