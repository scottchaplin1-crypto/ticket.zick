import { useEffect, useState } from "react";
import { Plus, Trash2, Send, CheckCircle2, LayoutTemplate } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import SaveStatus from "../components/SaveStatus.jsx";
import EmbedEditor, { DEFAULT_EMBED } from "../components/EmbedEditor.jsx";
import { useAutoSave } from "../hooks/useAutoSave.js";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

const BLANK = { name: "New Message", content: "", embeds: [] };

export default function EmbedMessages({ guildId }) {
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendChannelId, setSendChannelId] = useState("");
  const [sendResult, setSendResult] = useState(null);
  const { requestNavigation } = useUnsavedChanges();

  function load() {
    return api.get(`/api/embed-messages/guild/${guildId}`).then((res) => {
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
    setForm(msg ? { ...msg, embeds: JSON.parse(msg.embeds || "[]") } : BLANK);
    setSendChannelId("");
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
      const { data } = await api.post(`/api/embed-messages/guild/${guildId}`, toPayload());
      await load();
      applySelection(data);
    } finally {
      setSaving(false);
    }
  }

  const saveStatus = useAutoSave(form, () => api.patch(`/api/embed-messages/${selected}`, toPayload()).then(load), {
    enabled: !!selected,
    resetKey: selected,
  });

  async function remove() {
    if (!selected || !confirm("Delete this message? This won't delete it from Discord if it's already been sent.")) return;
    await api.delete(`/api/embed-messages/${selected}`);
    await load();
    applySelection(null);
  }

  async function sendMessage() {
    if (!selected || !sendChannelId) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post(`/api/embed-messages/${selected}/send`, { channelId: sendChannelId });
      await load();
      const editing = form.channelId === sendChannelId;
      setSendResult({ ok: true, message: editing ? `Updated the existing message in #${textChannels.find((c) => c.id === sendChannelId)?.name}` : `Sent to #${textChannels.find((c) => c.id === sendChannelId)?.name}` });
    } catch (err) {
      setSendResult({ ok: false, message: err.response?.data?.error || "Couldn't send the message." });
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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Embed Messages</h1>
        <div className="flex items-center gap-4">
          {selected && <SaveStatus status={saveStatus} />}
          <button onClick={newMessage} className="flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium">
            <Plus size={16} /> New Message
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Build rich messages with text and any number of embeds, save them, and post them through the bot to any
        channel. Re-sending to the same channel edits that message instead of posting a duplicate.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {messages.map((m) => (
          <button
            key={m.id}
            onClick={() => select(m)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              m.id === selected ? "bg-cyan-500 text-[#0b1416] shadow-lg shadow-cyan-500/25" : "bg-surface2 hover:bg-surface3 text-gray-300"
            }`}
          >
            {m.name}
          </button>
        ))}
        {messages.length === 0 && <p className="text-sm text-gray-500">No saved messages yet.</p>}
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <LayoutTemplate size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Message</h3>
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs text-gray-400 mb-1">Name (internal)</span>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block">
                <span className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Text content (shown above the embeds)</span>
                  <span className={form.content.length > 2000 ? "text-red-400" : ""}>{form.content.length}/2000</span>
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

          {!selected && (
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Create message"}
            </button>
          )}
          {selected && (
            <button onClick={remove} className="w-full py-2 text-red-400 text-sm hover:underline flex items-center justify-center gap-1.5">
              <Trash2 size={14} /> Delete message
            </button>
          )}

          {selected && (
            <div className="bg-surface2 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Send size={15} className="text-cyan-400" />
                <h3 className="font-semibold text-gray-200 text-sm">Send to Discord</h3>
              </div>
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
                  onClick={sendMessage}
                  disabled={!sendChannelId || sending}
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
                  Last posted in #{textChannels.find((c) => c.id === form.channelId)?.name || "a channel"} — sending to that
                  same channel again will update it in place.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="sticky top-6">
          <Card title="Live preview">
            <div className="bg-[#313338] rounded-lg p-4 space-y-3">
              {form.content && <p className="text-gray-100 text-sm whitespace-pre-wrap">{form.content}</p>}
              {form.embeds.map((embed) => (
                <div key={embed.id} className="border-l-4 rounded bg-black/20 p-3" style={{ borderColor: embed.color || "#5865F2" }}>
                  {embed.authorName && <p className="text-xs text-gray-300 font-medium mb-1">{embed.authorName}</p>}
                  {embed.title && <p className="text-white font-bold text-sm">{embed.title}</p>}
                  {embed.description && <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{embed.description}</p>}
                  {embed.fields?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {embed.fields.map((f, i) => (
                        <div key={i} className={f.inline ? "" : "col-span-2"}>
                          <p className="text-xs font-semibold text-gray-200">{f.name}</p>
                          <p className="text-xs text-gray-400">{f.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
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
