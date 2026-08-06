import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Terminal, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import { useUnsavedChanges, confirmDiscard } from "../context/UnsavedChangesContext.jsx";

const BLANK = {
  trigger: "",
  embedTitle: "",
  embedDescription: "",
  embedColor: "#5865F2",
  embedImageUrl: "",
  embedThumbnailUrl: "",
};

export default function CustomCommands({ guildId }) {
  const [commands, setCommands] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { isDirty, setDirty } = useUnsavedChanges();
  const baselineRef = useRef(JSON.stringify(BLANK));

  function load() {
    api.get(`/api/custom-commands/guild/${guildId}`).then((res) => setCommands(res.data));
  }
  useEffect(load, [guildId]);

  // Compares the live form against whatever it looked like right after the last
  // load/save, so "dirty" reflects real unsaved edits rather than every render.
  useEffect(() => {
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form]);

  function select(cmd) {
    if (!confirmDiscard(isDirty)) return;
    setSelected(cmd.id);
    setForm(cmd);
    baselineRef.current = JSON.stringify(cmd);
    setError("");
  }

  function newCommand() {
    if (!confirmDiscard(isDirty)) return;
    setSelected(null);
    setForm(BLANK);
    baselineRef.current = JSON.stringify(BLANK);
    setError("");
  }

  async function save() {
    if (!form.trigger.trim()) {
      setError("Give the command a trigger word or phrase first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (selected) {
        await api.patch(`/api/custom-commands/${selected}`, form);
      } else {
        const { data } = await api.post(`/api/custom-commands/guild/${guildId}`, form);
        setSelected(data.id);
      }
      baselineRef.current = JSON.stringify(form);
      setDirty(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save that command.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this command?")) return;
    await api.delete(`/api/custom-commands/${id}`);
    if (selected === id) newCommand();
    load();
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Custom Commands</h1>
        <button onClick={newCommand} className="flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium">
          <Plus size={16} /> New Command
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Typing the trigger word/phrase exactly, in any channel, posts the embed you set up here — anyone can use these,
        not just staff.
      </p>

      <div className="grid grid-cols-2 gap-6 items-start">
        <Card title="Existing commands">
          <div className="divide-y divide-white/5">
            {commands.map((c) => (
              <button
                key={c.id}
                onClick={() => select(c)}
                className={`w-full flex items-center justify-between py-2.5 text-left ${selected === c.id ? "text-cyan-400" : "text-gray-300 hover:text-white"} transition`}
              >
                <span className="flex items-center gap-2 text-sm">
                  <Terminal size={13} className="opacity-60" />
                  {c.trigger}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(c.id); }}
                  className="text-gray-600 hover:text-red-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </button>
            ))}
            {commands.length === 0 && <p className="text-sm text-gray-500 py-2">No custom commands yet.</p>}
          </div>
        </Card>

        <Card title={selected ? "Edit command" : "New command"}>
          <div className="space-y-3">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Trigger (exact text that fires it, e.g. !rules)
                <Tooltip text="Must be typed exactly — case doesn't matter, but partial matches won't fire it. '!rules' won't trigger on '!rules please'.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <input className="input" value={form.trigger} onChange={set("trigger")} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Embed title</span>
              <input className="input" value={form.embedTitle} onChange={set("embedTitle")} />
            </label>
            <label className="block">
              <span className="block text-xs text-gray-400 mb-1">Embed description</span>
              <textarea className="input" rows={3} value={form.embedDescription} onChange={set("embedDescription")} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Embed color</span>
                <input type="color" className="input h-10" value={form.embedColor} onChange={set("embedColor")} />
              </label>
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  Image URL
                  <Tooltip text="A large image shown below the description — good for a banner or screenshot.">
                    <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                  </Tooltip>
                </span>
                <input className="input" value={form.embedImageUrl || ""} onChange={set("embedImageUrl")} />
              </label>
            </div>
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Thumbnail URL
                <Tooltip text="A small image in the top-right corner — good for a logo or icon.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <input className="input" value={form.embedThumbnailUrl || ""} onChange={set("embedThumbnailUrl")} />
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}
            {isDirty && !error && <p className="text-xs text-amber-400">You have unsaved changes.</p>}

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : selected ? "Save changes" : "Create command"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
