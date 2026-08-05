import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Ticket, Trash2, Palette, MousePointerClick, Settings2, FileText, Info, AtSign, ListChecks, Send, CheckCircle2 } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import RoleMultiSelect from "../components/RoleMultiSelect.jsx";

const BUTTON_COLORS = {
  Primary: "#5865F2",
  Secondary: "#4E5058",
  Success: "#23A55A",
  Danger: "#DA373C",
};

// pingRoleIds is kept as a real array in form state for the UI's sake — it's only
// ever a JSON string at the database/API boundary (see loadPanels and save below).
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
  pingRoleIds: [],
  questionsEnabled: false,
  questions: [],
  transcriptEnabled: true,
  transcriptDestination: "dm",
  transcriptChannelId: "",
};

export default function PanelBuilder({ guildId }) {
  const { panelId } = useParams(); // undefined = "new panel" screen
  const navigate = useNavigate();

  const [panels, setPanels] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendChannelId, setSendChannelId] = useState("");
  const [sendResult, setSendResult] = useState(null); // { ok: bool, message: string } | null
  const [loaded, setLoaded] = useState(false);

  function loadPanels() {
    return api.get(`/api/panels/guild/${guildId}`).then((res) => {
      setPanels(res.data);
      return res.data;
    });
  }

  useEffect(() => {
    loadPanels();
  }, [guildId]);

  useEffect(() => {
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
  }, [guildId]);

  // The selected panel lives in the URL now (not local state), so switching to
  // another tab and back — or refreshing the page — keeps you exactly where you were.
  useEffect(() => {
    setLoaded(false);
    if (!panelId) {
      setForm(BLANK);
      setLoaded(true);
      return;
    }
    loadPanels().then((list) => {
      const panel = list.find((p) => p.id === panelId);
      if (panel) {
        let pingRoleIds = [];
        try {
          pingRoleIds = JSON.parse(panel.pingRoleIds || "[]");
        } catch {
          pingRoleIds = [];
        }
        let questions = [];
        try {
          questions = JSON.parse(panel.questions || "[]");
        } catch {
          questions = [];
        }
        setForm({ ...panel, pingRoleIds, questions });
        localStorage.setItem(`tz:lastPanel:${guildId}`, panelId);
      }
      setLoaded(true);
    });
  }, [panelId, guildId]);

  const textChannels = channels.filter((c) => c.type === 0);
  const categories = channels.filter((c) => c.type === 4);

  function toPayload() {
    return { ...form, pingRoleIds: JSON.stringify(form.pingRoleIds), questions: JSON.stringify(form.questions) };
  }

  async function save() {
    setSaving(true);
    try {
      if (panelId) {
        await api.patch(`/api/panels/${panelId}`, toPayload());
        await loadPanels();
      } else {
        const { data } = await api.post(`/api/panels/guild/${guildId}`, toPayload());
        await loadPanels();
        navigate(`/guild/${guildId}/panel/${data.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!panelId || !confirm("Delete this panel? This can't be undone.")) return;
    await api.delete(`/api/panels/${panelId}`);
    await loadPanels();
    navigate(`/guild/${guildId}`);
  }

  async function sendPanel() {
    if (!panelId || !sendChannelId) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post(`/api/panels/${panelId}/send`, { channelId: sendChannelId });
      await loadPanels();
      setSendResult({ ok: true, message: `Sent to #${textChannels.find((c) => c.id === sendChannelId)?.name || "channel"}` });
    } catch (err) {
      setSendResult({ ok: false, message: err.response?.data?.error || "Couldn't send the panel." });
    } finally {
      setSending(false);
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  function addQuestion() {
    if (form.questions.length >= 5) return;
    const id = `q_${Math.random().toString(36).slice(2, 8)}`;
    setForm({
      ...form,
      questions: [...form.questions, { id, label: "", style: "short", required: true, placeholder: "" }],
    });
  }

  function updateQuestion(id, key, value) {
    setForm({
      ...form,
      questions: form.questions.map((q) => (q.id === id ? { ...q, [key]: value } : q)),
    });
  }

  function removeQuestion(id) {
    setForm({ ...form, questions: form.questions.filter((q) => q.id !== id) });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold">Ticket Panels</h1>
        <button
          onClick={() => navigate(`/guild/${guildId}`)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> New Panel
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/guild/${guildId}/panel/${p.id}`)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              p.id === panelId ? "bg-blurple text-white" : "bg-surface2 hover:bg-surface3 text-gray-300"
            }`}
          >
            {p.name}
          </button>
        ))}
        {panels.length === 0 && <p className="text-sm text-gray-500">No panels yet — create your first one below.</p>}
      </div>

      {/* Context bar: always makes it obvious what you're editing right now */}
      <div className="flex items-center gap-2.5 mb-4 px-4 py-2.5 rounded-lg bg-surface2 border border-white/5">
        <Ticket size={16} className="text-blurple shrink-0" />
        <span className="text-sm text-gray-400">
          {panelId ? (
            <>
              Editing <span className="text-white font-medium">{form.name}</span>
            </>
          ) : (
            <span className="text-white font-medium">Creating a new panel</span>
          )}
        </span>
      </div>

      {!loaded ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <Card>
              <SectionHeading icon={Palette} title="Embed appearance" />
              <div className="space-y-3">
                <Field label="Panel name (internal)" hint="Only shown here in the dashboard — never visible in Discord.">
                  <input className="input" value={form.name} onChange={set("name")} />
                </Field>
                <Field label="Embed title" hint="The bold headline shown at the top of the panel message in Discord.">
                  <input className="input" value={form.embedTitle} onChange={set("embedTitle")} />
                </Field>
                <Field label="Embed description">
                  <textarea className="input" rows={3} value={form.embedDescription} onChange={set("embedDescription")} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Embed color"><input type="color" className="input h-10" value={form.embedColor} onChange={set("embedColor")} /></Field>
                  <Field label="Embed image URL" hint="A large image shown below the description — good for a banner or graphic. Leave blank for none.">
                    <input className="input" value={form.embedImageUrl || ""} onChange={set("embedImageUrl")} />
                  </Field>
                </div>
                <Field label="Embed thumbnail URL" hint="A small image shown in the top-right corner of the embed — good for a logo or icon. Leave blank for none.">
                  <input className="input" value={form.embedThumbnailUrl || ""} onChange={set("embedThumbnailUrl")} />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeading icon={MousePointerClick} title="Button" />
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                  <Field label="Button label"><input className="input" value={form.buttonLabel} onChange={set("buttonLabel")} /></Field>
                  <Field label="Emoji">
                    <div className="w-24">
                      <EmojiPicker value={form.buttonEmoji} onChange={(v) => setForm({ ...form, buttonEmoji: v })} />
                    </div>
                  </Field>
                </div>
                <Field
                  label="Button style"
                  hint="Only changes the button's color in Discord, matching Discord's own four colors — it doesn't change what happens when someone clicks it. Check the live preview to see the actual color."
                >
                  <select className="input" value={form.buttonStyle} onChange={set("buttonStyle")}>
                    <option>Primary</option><option>Secondary</option><option>Success</option><option>Danger</option>
                  </select>
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeading icon={ListChecks} title="Pre-ticket questions" />
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input type="checkbox" checked={form.questionsEnabled} onChange={set("questionsEnabled")} />
                  Ask questions before the ticket opens
                </label>
                <p className="text-xs text-gray-500">
                  When enabled, clicking the button shows a short form first. Answers appear as fields in the
                  ticket's opening message so staff see them right away. Max 5 questions — that's a Discord limit,
                  not ours. Only applies to the panel button, not the <code>$new</code> quick-add command.
                </p>

                {form.questionsEnabled && (
                  <div className="space-y-3 pt-1">
                    {form.questions.map((q, i) => (
                      <div key={q.id} className="bg-surface3 rounded-lg p-3 space-y-2.5 border border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-400">Question {i + 1}</span>
                          <button onClick={() => removeQuestion(q.id)} className="text-gray-500 hover:text-red-400 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <input
                          className="input h-9 text-sm w-full"
                          placeholder="e.g. What's your in-game username?"
                          value={q.label}
                          onChange={(e) => updateQuestion(q.id, "label", e.target.value)}
                          maxLength={45}
                        />

                        <div className="grid grid-cols-2 gap-2">
                          <select
                            className="input h-9 text-sm"
                            value={q.style}
                            onChange={(e) => updateQuestion(q.id, "style", e.target.value)}
                          >
                            <option value="short">Short answer</option>
                            <option value="paragraph">Paragraph</option>
                          </select>
                          <label className="flex items-center gap-1.5 text-xs text-gray-400 px-1">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => updateQuestion(q.id, "required", e.target.checked)}
                            />
                            Required
                          </label>
                        </div>

                        <input
                          className="input h-9 text-sm w-full"
                          placeholder="Placeholder text shown in the empty box (optional)"
                          value={q.placeholder}
                          onChange={(e) => updateQuestion(q.id, "placeholder", e.target.value)}
                          maxLength={100}
                        />
                      </div>
                    ))}

                    {form.questions.length === 0 && (
                      <p className="text-sm text-gray-500 italic">No questions yet — add one below.</p>
                    )}

                    <button
                      onClick={addQuestion}
                      disabled={form.questions.length >= 5}
                      className="w-full py-2 border border-dashed border-white/15 hover:border-blurple hover:text-blurple transition rounded-lg text-sm text-gray-400 disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:text-gray-400 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      {form.questions.length >= 5 ? "Maximum 5 questions reached" : "Add question"}
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <SectionHeading icon={Settings2} title="Ticket behavior" />
              <div className="space-y-3">
                <Field label="Ticket category" hint="New ticket channels get created inside this Discord category. Leave blank to create them loose in the channel list.">
                  <select className="input" value={form.ticketCategoryId || ""} onChange={set("ticketCategoryId")}>
                    <option value="">No category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Channel naming pattern" hint={`{number} becomes the ticket number, {username} becomes the opener's name. Example: "ticket-{number}" → ticket-0007`}>
                  <input className="input" value={form.namingPattern} onChange={set("namingPattern")} />
                </Field>
                <Field label="Max open tickets per user" hint="Blocks someone from opening another ticket on this panel while they already have one open.">
                  <input type="number" min={1} className="input" value={form.maxOpenPerUser} onChange={set("maxOpenPerUser")} />
                </Field>
                <Field
                  label="Roles to ping when a ticket opens"
                  hint="Pick any roles — doesn't have to be your main support team. Useful for event-specific staff who only need to see tickets tied to their own event."
                >
                  <RoleMultiSelect
                    roles={roles}
                    selected={form.pingRoleIds}
                    onChange={(ids) => setForm({ ...form, pingRoleIds: ids })}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeading icon={FileText} title="Transcript" />
              <div className="space-y-3">
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
              </div>
            </Card>

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50 shadow-lg shadow-blurple/10"
            >
              {saving ? "Saving…" : panelId ? "Save changes" : "Create panel"}
            </button>
            {panelId && (
              <button onClick={remove} className="w-full py-2 text-red-400 text-sm hover:underline flex items-center justify-center gap-1.5">
                <Trash2 size={14} /> Delete panel
              </button>
            )}
            {panelId && (
              <div className="bg-surface2 border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Send size={15} className="text-blurple" />
                  <h3 className="font-semibold text-gray-200 text-sm">Send to Discord</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Post this panel's button in a channel — updates the same message next time if it's already been sent there.
                </p>
                <div className="flex gap-2">
                  <select className="input flex-1" value={sendChannelId} onChange={(e) => setSendChannelId(e.target.value)}>
                    <option value="">Select a channel…</option>
                    {textChannels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={sendPanel}
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
                    Currently posted in #{textChannels.find((c) => c.id === form.channelId)?.name || "a channel"}
                  </p>
                )}
                <p className="text-xs text-gray-600 pt-1 border-t border-white/5">
                  Panel ID (for the <code>/panel-send</code> command, if you prefer that): <code className="text-gray-500">{panelId}</code>
                </p>
              </div>
            )}
          </div>

          <div className="sticky top-6">
            <Card title="Live preview">
              <div className="bg-[#313338] rounded-lg p-4 border-l-4" style={{ borderColor: form.embedColor }}>
                <p className="font-bold text-white">{form.embedTitle}</p>
                <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{form.embedDescription}</p>
                {form.embedImageUrl && <img src={form.embedImageUrl} className="mt-3 rounded max-h-40 object-cover" />}
                <button
                  className="mt-4 px-4 py-2 rounded text-white text-sm font-medium"
                  style={{ backgroundColor: BUTTON_COLORS[form.buttonStyle] || BUTTON_COLORS.Primary }}
                >
                  {form.buttonEmoji} {form.buttonLabel}
                </button>
                {form.pingRoleIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                    <AtSign size={12} />
                    Pings {form.pingRoleIds
                      .map((id) => roles.find((r) => r.id === id)?.name)
                      .filter(Boolean)
                      .join(", ") || `${form.pingRoleIds.length} role(s)`}{" "}
                    when opened
                  </p>
                )}
                {form.questionsEnabled && form.questions.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <ListChecks size={12} />
                    Asks {form.questions.length} question{form.questions.length > 1 ? "s" : ""} before opening
                  </p>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
      <Icon size={15} className="text-blurple" />
      <h3 className="font-semibold text-gray-200 text-sm">{title}</h3>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
        {label}
        {hint && (
          <Tooltip text={hint}>
            <Info size={12} className="text-gray-600 hover:text-gray-400 transition cursor-help" />
          </Tooltip>
        )}
      </span>
      {children}
    </label>
  );
}
