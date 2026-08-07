import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Clock, Send, CheckCircle2 } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import Toggle from "../components/Toggle.jsx";
import EmbedEditor, { DEFAULT_EMBED } from "../components/EmbedEditor.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

const BLANK = { name: "New Auto Message", content: "", embeds: [], channelId: "", intervalMinutes: 60, enabled: true };

const UNIT_OPTIONS = [
  { value: 1, label: "Minutes" },
  { value: 60, label: "Hours" },
  { value: 1440, label: "Days" },
];

export default function AutoMessages({ guildId }) {
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [unit, setUnit] = useState(1);
  const [saving, setSaving] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [sending, setSending] = useState(false);
  const { isDirty, setDirty, requestNavigation } = useUnsavedChanges();
  const baselineRef = useRef(JSON.stringify(BLANK));

  function load() {
    return api.get(`/api/auto-messages/guild/${guildId}`).then((res) => {
      setMessages(res.data);
      return res.data;
    });
  }

  useEffect(() => {
    load();
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
  }, [guildId]);

  const textChannels = channels.filter((c) => c.type === 0);

  function toPayload() {
    return { ...form, embeds: JSON.stringify(form.embeds) };
  }

  function applySelection(msg) {
    setSelected(msg?.id ?? null);
    let data;
    if (msg) {
      data = { ...msg, embeds: JSON.parse(msg.embeds || "[]") };
      setForm(data);
      // Pick whichever unit divides the stored minutes cleanly, so e.g. 120
      // shows as "2 Hours" instead of "120 Minutes".
      const bestUnit = [1440, 60, 1].find((u) => msg.intervalMinutes % u === 0) || 1;
      setUnit(bestUnit);
    } else {
      data = BLANK;
      setForm(BLANK);
      setUnit(1);
    }
    baselineRef.current = JSON.stringify(data);
    setSendResult(null);
  }

  function select(msg) {
    requestNavigation(() => applySelection(msg));
  }
  function newMessage() {
    requestNavigation(() => applySelection(null));
  }

  async function save() {
    setSaving(true);
    try {
      if (selected) {
        await api.patch(`/api/auto-messages/${selected}`, toPayload());
        await load();
        baselineRef.current = JSON.stringify(form);
        setDirty(false);
      } else {
        const { data } = await api.post(`/api/auto-messages/guild/${guildId}`, toPayload());
        await load();
        applySelection(data);
      }
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form]);

  async function remove() {
    if (!selected || !confirm("Delete this auto message?")) return;
    await api.delete(`/api/auto-messages/${selected}`);
    await load();
    applySelection(null);
  }

  async function sendNow() {
    if (!selected) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post(`/api/auto-messages/${selected}/send-now`);
      setSendResult({ ok: true, message: "Sent — the interval clock has been reset from now." });
    } catch (err) {
      setSendResult({ ok: false, message: err.response?.data?.error || "Couldn't send." });
    } finally {
      setSending(false);
    }
  }

  function addEmbed() {
    setForm({ ...form, embeds: [...form.embeds, DEFAULT_EMBED()] });
  }
  function updateEmbed(i, embed) {
    const embeds = [...form.embeds];
    embeds[i] = embed;
    setForm({ ...form, embeds });
  }
  function removeEmbed(i) {
    setForm({ ...form, embeds: form.embeds.filter((_, idx) => idx !== i) });
  }
  function duplicateEmbed(i) {
    const copy = { ...form.embeds[i], id: `e_${Math.random().toString(36).slice(2, 9)}` };
    const embeds = [...form.embeds];
    embeds.splice(i + 1, 0, copy);
    setForm({ ...form, embeds });
  }

  const intervalValue = unit ? Math.round(form.intervalMinutes / unit) : form.intervalMinutes;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Auto Messages</h1>
        <div className="flex items-center gap-4">
          {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
          <button onClick={newMessage} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg text-sm font-medium">
            <Plus size={16} /> New Auto Message
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Posts a message automatically on a repeating schedule — announcements, reminders, event pings, whatever
        needs to go out regularly without someone remembering to send it.
      </p>

      <div className="mb-6">
        <Select
          value={selected || ""}
          onChange={(id) => select(messages.find((m) => m.id === id))}
          options={messages.map((m) => ({
            value: m.id,
            label: `${m.name} — every ${m.intervalMinutes >= 1440 ? `${m.intervalMinutes / 1440}d` : m.intervalMinutes >= 60 ? `${m.intervalMinutes / 60}h` : `${m.intervalMinutes}m`}${m.enabled ? "" : " (off)"}`,
          }))}
          placeholder={messages.length ? "Select an auto message…" : "No auto messages yet — create one below"}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <Clock size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Schedule</h3>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Name (internal)</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>

              <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Enabled" />

              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Channel</span>
                <Select
                  value={form.channelId}
                  onChange={(v) => setForm({ ...form, channelId: v })}
                  options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
                  placeholder="Select a channel…"
                />
              </label>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Repeat every</span>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    value={intervalValue}
                    onChange={(e) => setForm({ ...form, intervalMinutes: Math.max(1, parseInt(e.target.value, 10) || 1) * unit })}
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">&nbsp;</span>
                  <Select
                    value={unit}
                    onChange={(v) => {
                      const newUnit = Number(v);
                      setUnit(newUnit);
                      setForm({ ...form, intervalMinutes: Math.max(1, intervalValue) * newUnit });
                    }}
                    options={UNIT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                </label>
              </div>
              {form.intervalMinutes < 5 && (
                <p className="text-xs text-amber-400">Very short intervals will hit Discord's rate limits fast — 5+ minutes is safer for anything long-term.</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              <label className="block">
                <span className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Text content</span>
                  <span className="flex items-center gap-2">
                    <EmojiPicker guildId={guildId} mode="insert" onInsert={(code) => setForm({ ...form, content: form.content + code })} />
                    <span className={form.content.length > 2000 ? "text-red-400" : ""}>{form.content.length}/2000</span>
                  </span>
                </span>
                <textarea
                  className="input"
                  rows={3}
                  maxLength={2000}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                />
              </label>
            </div>
          </Card>

          <div className="space-y-3">
            {form.embeds.map((embed, i) => (
              <EmbedEditor
                key={embed.id}
                embed={embed}
                index={i}
                guildId={guildId}
                onChange={(e) => updateEmbed(i, e)}
                onRemove={() => removeEmbed(i)}
                onDuplicate={() => duplicateEmbed(i)}
              />
            ))}
            <button
              onClick={addEmbed}
              disabled={form.embeds.length >= 10}
              className="w-full py-2 border border-dashed border-white/15 hover:border-cyan-400 hover:text-cyan-400 transition rounded-lg text-sm text-gray-400 disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> {form.embeds.length >= 10 ? "Maximum 10 embeds reached" : "Add embed"}
            </button>
          </div>

          <button
            onClick={save}
            disabled={saving || !form.channelId}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : selected ? "Save changes" : "Create auto message"}
          </button>
          {selected && (
            <>
              <button
                onClick={sendNow}
                disabled={sending}
                className="w-full py-2 bg-surface3 hover:bg-white/10 transition rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send size={14} /> {sending ? "Sending…" : "Send now (resets the schedule)"}
              </button>
              {sendResult && (
                <p className={`text-xs flex items-center gap-1.5 ${sendResult.ok ? "text-green-400" : "text-red-400"}`}>
                  {sendResult.ok && <CheckCircle2 size={12} />}
                  {sendResult.message}
                </p>
              )}
              <button onClick={remove} className="w-full py-2 text-red-400 text-sm hover:underline flex items-center justify-center gap-1.5">
                <Trash2 size={14} /> Delete auto message
              </button>
            </>
          )}
        </div>

        <div className="sticky top-6">
          <Card title="Live preview">
            <div className="bg-[#313338] rounded-lg p-4 space-y-3">
              {form.content && <p className="text-gray-100 text-sm whitespace-pre-wrap">{form.content}</p>}
              {form.embeds.map((embed) => (
                <div key={embed.id} className="border-l-4 rounded bg-black/20 p-3" style={{ borderColor: embed.color || "#5865F2" }}>
                  {embed.title && <p className="text-white font-bold text-sm">{embed.title}</p>}
                  {embed.description && <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{embed.description}</p>}
                  {embed.imageUrl && <img src={embed.imageUrl} className="mt-2 rounded max-h-40 object-cover w-full" />}
                  {embed.footerText && <p className="text-gray-500 text-xs mt-2">{embed.footerText}</p>}
                </div>
              ))}
              {!form.content && form.embeds.length === 0 && <p className="text-sm text-gray-500 italic">Nothing to preview yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
