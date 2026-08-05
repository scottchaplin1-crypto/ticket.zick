import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

const BLANK = {
  name: "New Panel",
  embedTitle: "Need help?",
  embedDescription: "Click the button below to open a ticket.",
  embedColor: "#5865F2",
  embedImageUrl: "",
  embedThumbnailUrl: "",
  buttonLabel: "Open Ticket",
  buttonEmoji: "🎫",
  buttonStyle: "Primary",
  ticketCategoryId: "",
  namingPattern: "ticket-{number}",
  maxOpenPerUser: 1,
  pingRoleIds: "[]",
  transcriptEnabled: true,
  transcriptDestination: "dm",
  transcriptChannelId: "",
};

export default function PanelBuilder({ guildId }) {
  const [panels, setPanels] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  function load() {
    api.get(`/api/panels/guild/${guildId}`).then((res) => setPanels(res.data));
  }

  useEffect(load, [guildId]);
  useEffect(() => {
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
  }, [guildId]);

  const textChannels = channels.filter((c) => c.type === 0);
  const categories = channels.filter((c) => c.type === 4);

  function select(panel) {
    setSelected(panel.id);
    setForm(panel);
  }

  function newPanel() {
    setSelected(null);
    setForm(BLANK);
  }

  async function save() {
    setSaving(true);
    try {
      if (selected) {
        await api.patch(`/api/panels/${selected}`, form);
      } else {
        const { data } = await api.post(`/api/panels/guild/${guildId}`, form);
        setSelected(data.id);
      }
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this panel? This can't be undone.")) return;
    await api.delete(`/api/panels/${id}`);
    if (selected === id) newPanel();
    load();
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ticket Panels</h1>
        <button onClick={newPanel} className="px-4 py-2 bg-blurple rounded-lg text-sm font-medium">+ New Panel</button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => select(p)}
            className={`px-3 py-1.5 rounded-lg text-sm ${selected === p.id ? "bg-blurple" : "bg-surface2 hover:bg-surface3"}`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card title="Configuration">
          <div className="space-y-3">
            <Field label="Panel name (internal)"><input className="input" value={form.name} onChange={set("name")} /></Field>
            <Field label="Embed title"><input className="input" value={form.embedTitle} onChange={set("embedTitle")} /></Field>
            <Field label="Embed description">
              <textarea className="input" rows={3} value={form.embedDescription} onChange={set("embedDescription")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Embed color"><input type="color" className="input h-10" value={form.embedColor} onChange={set("embedColor")} /></Field>
              <Field label="Button style">
                <select className="input" value={form.buttonStyle} onChange={set("buttonStyle")}>
                  <option>Primary</option><option>Secondary</option><option>Success</option><option>Danger</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Button label"><input className="input" value={form.buttonLabel} onChange={set("buttonLabel")} /></Field>
              <Field label="Button emoji"><input className="input" value={form.buttonEmoji} onChange={set("buttonEmoji")} /></Field>
            </div>
            <Field label="Embed image URL"><input className="input" value={form.embedImageUrl || ""} onChange={set("embedImageUrl")} /></Field>
            <Field label="Embed thumbnail URL"><input className="input" value={form.embedThumbnailUrl || ""} onChange={set("embedThumbnailUrl")} /></Field>
            <Field label="Ticket category">
              <select className="input" value={form.ticketCategoryId || ""} onChange={set("ticketCategoryId")}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Channel naming pattern"><input className="input" value={form.namingPattern} onChange={set("namingPattern")} /></Field>
            <Field label="Max open tickets per user">
              <input type="number" min={1} className="input" value={form.maxOpenPerUser} onChange={set("maxOpenPerUser")} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="checkbox" checked={form.transcriptEnabled} onChange={set("transcriptEnabled")} />
              Save a transcript when tickets close
            </label>

            {form.transcriptEnabled && (
              <>
                <Field label="Send transcript to">
                  <select className="input" value={form.transcriptDestination} onChange={set("transcriptDestination")}>
                    <option value="dm">DM the ticket opener</option>
                    <option value="channel">Post in a channel</option>
                    <option value="both">Both</option>
                  </select>
                </Field>

                {(form.transcriptDestination === "channel" || form.transcriptDestination === "both") && (
                  <Field label="Transcript channel">
                    <select className="input" value={form.transcriptChannelId || ""} onChange={set("transcriptChannelId")}>
                      <option value="">Select a channel…</option>
                      {textChannels.map((c) => (
                        <option key={c.id} value={c.id}>#{c.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="w-full mt-2 py-2 bg-blurple rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : selected ? "Save changes" : "Create panel"}
            </button>
            {selected && (
              <button onClick={() => remove(selected)} className="w-full py-2 text-red-400 text-sm hover:underline">
                Delete panel
              </button>
            )}
            {selected && (
              <p className="text-xs text-gray-500 pt-2">
                Panel ID (use with <code>/panel-send</code>): <code className="text-gray-400">{selected}</code>
              </p>
            )}
          </div>
        </Card>

        <Card title="Live preview">
          <div className="bg-[#313338] rounded-lg p-4 border-l-4" style={{ borderColor: form.embedColor }}>
            <p className="font-bold text-white">{form.embedTitle}</p>
            <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{form.embedDescription}</p>
            {form.embedImageUrl && <img src={form.embedImageUrl} className="mt-3 rounded max-h-40 object-cover" />}
            <button className="mt-4 px-4 py-2 rounded bg-blurple text-white text-sm font-medium">
              {form.buttonEmoji} {form.buttonLabel}
            </button>
          </div>
        </Card>
      </div>
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
