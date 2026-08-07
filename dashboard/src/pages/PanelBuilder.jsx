import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Ticket, Trash2, Palette, MousePointerClick, Settings2, FileText, Info, AtSign, ListChecks, Send, CheckCircle2, UserCog } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import EmojiPicker from "../components/EmojiPicker.jsx";
import RoleMultiSelect from "../components/RoleMultiSelect.jsx";
import Toggle from "../components/Toggle.jsx";
import Select from "../components/Select.jsx";
import ImageUrlField from "../components/ImageUrlField.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

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
  welcomeMessage: "Thanks for reaching out! Support will be with you shortly.",
  footerText: "Powered by Ticket Zick",
  pingRoleIds: [],
  accessRoleIds: [],
  openAddRoleIds: [],
  closeAddRoleIds: [],
  closeRemoveRoleIds: [],
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
  const baselineRef = useRef(JSON.stringify(BLANK));

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
    setSendChannelId("");
    setSendResult(null);
    if (!panelId) {
      setForm(BLANK);
      setLoaded(true);
      return;
    }
    loadPanels().then((list) => {
      const panel = list.find((p) => p.id === panelId);
      if (panel) {
        const parseArray = (value) => {
          try {
            return JSON.parse(value || "[]");
          } catch {
            return [];
          }
        };
        const data = {
          ...panel,
          pingRoleIds: parseArray(panel.pingRoleIds),
          questions: parseArray(panel.questions),
          accessRoleIds: parseArray(panel.accessRoleIds),
          openAddRoleIds: parseArray(panel.openAddRoleIds),
          closeAddRoleIds: parseArray(panel.closeAddRoleIds),
          closeRemoveRoleIds: parseArray(panel.closeRemoveRoleIds),
        };
        setForm(data);
        baselineRef.current = JSON.stringify(data);
        localStorage.setItem(`tz:lastPanel:${guildId}`, panelId);
      } else {
        baselineRef.current = JSON.stringify(BLANK);
      }
      setLoaded(true);
    });
  }, [panelId, guildId]);

  const textChannels = channels.filter((c) => c.type === 0);
  const categories = channels.filter((c) => c.type === 4);

  function toPayload() {
    return {
      ...form,
      pingRoleIds: JSON.stringify(form.pingRoleIds),
      questions: JSON.stringify(form.questions),
      accessRoleIds: JSON.stringify(form.accessRoleIds),
      openAddRoleIds: JSON.stringify(form.openAddRoleIds),
      closeAddRoleIds: JSON.stringify(form.closeAddRoleIds),
      closeRemoveRoleIds: JSON.stringify(form.closeRemoveRoleIds),
    };
  }

  // Dirty means "differs from whatever was last loaded or saved" — works the same
  // way whether this is a brand new panel (baseline = BLANK) or an existing one
  // (baseline = what was loaded from the server).
  const { isDirty, setDirty, requestNavigation } = useUnsavedChanges();
  useEffect(() => {
    if (!loaded) return;
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form, loaded]);

  function guardedNavigate(to) {
    requestNavigation(() => navigate(to));
  }

  async function save() {
    setSaving(true);
    try {
      if (panelId) {
        await api.patch(`/api/panels/${panelId}`, toPayload());
        await loadPanels();
        baselineRef.current = JSON.stringify(form);
        setDirty(false);
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
    const wasAlreadyThere = form.channelId === sendChannelId && form.messageId;
    try {
      await api.post(`/api/panels/${panelId}/send`, { channelId: sendChannelId });
      await loadPanels();
      const channelName = textChannels.find((c) => c.id === sendChannelId)?.name || "channel";
      setSendResult({
        ok: true,
        message: wasAlreadyThere ? `Updated the existing message in #${channelName}` : `Sent to #${channelName}`,
      });
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
        <div className="flex items-center gap-4">
          {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
          <button
            onClick={() => guardedNavigate(`/guild/${guildId}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg text-sm font-medium"
          >
            <Plus size={16} /> New Panel
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {panels.map((p) => (
          <button
            key={p.id}
            onClick={() => guardedNavigate(`/guild/${guildId}/panel/${p.id}`)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              p.id === panelId
                ? "bg-cyan-500 text-[#0b1416] shadow-lg shadow-cyan-500/25"
                : "bg-surface2 hover:bg-surface3 text-gray-300"
            }`}
          >
            {p.name}
          </button>
        ))}
        {panels.length === 0 && <p className="text-sm text-gray-500">No panels yet — create your first one below.</p>}
      </div>

      {/* Context bar: always makes it obvious what you're editing right now */}
      <div className="flex items-center gap-2.5 mb-4 px-4 py-2.5 rounded-lg bg-surface2 border border-white/5">
        <Ticket size={16} className="text-cyan-400 shrink-0" />
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
                  <ImageUrlField label="Embed image URL" value={form.embedImageUrl} onChange={(v) => setForm({ ...form, embedImageUrl: v })} />
                </div>
                <ImageUrlField label="Embed thumbnail URL" value={form.embedThumbnailUrl} onChange={(v) => setForm({ ...form, embedThumbnailUrl: v })} />
              </div>
            </Card>

            <Card>
              <SectionHeading icon={MousePointerClick} title="Button" accent="cyan" />
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                  <Field label="Button label"><input className="input" value={form.buttonLabel} onChange={set("buttonLabel")} /></Field>
                  <Field label="Emoji">
                    <EmojiPicker guildId={guildId} value={form.buttonEmoji} onChange={(v) => setForm({ ...form, buttonEmoji: v })} />
                  </Field>
                </div>
                <Field
                  label="Button style"
                  hint="Only changes the button's color in Discord, matching Discord's own four colors — it doesn't change what happens when someone clicks it. Check the live preview to see the actual color."
                >
                  <Select
                    value={form.buttonStyle}
                    onChange={(v) => setForm({ ...form, buttonStyle: v })}
                    options={[
                      { value: "Primary", label: "Primary", color: "#5865F2" },
                      { value: "Secondary", label: "Secondary", color: "#4E5058" },
                      { value: "Success", label: "Success", color: "#23A55A" },
                      { value: "Danger", label: "Danger", color: "#DA373C" },
                    ]}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeading icon={ListChecks} title="Pre-ticket questions" accent="cyan" />
              <div className="space-y-3">
                <Toggle checked={form.questionsEnabled} onChange={(v) => setForm({ ...form, questionsEnabled: v })} label="Ask questions before the ticket opens" />
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

                        <div className="grid grid-cols-2 gap-2 items-center">
                          <Select
                            value={q.style}
                            onChange={(v) => updateQuestion(q.id, "style", v)}
                            options={[
                              { value: "short", label: "Short answer" },
                              { value: "paragraph", label: "Paragraph" },
                            ]}
                          />
                          <Toggle checked={q.required} onChange={(v) => updateQuestion(q.id, "required", v)} label="Required" />
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
                      className="w-full py-2 border border-dashed border-white/15 hover:border-cyan-400 hover:text-cyan-400 transition rounded-lg text-sm text-gray-400 disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:text-gray-400 flex items-center justify-center gap-1.5"
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
                  <Select
                    value={form.ticketCategoryId || ""}
                    onChange={(v) => setForm({ ...form, ticketCategoryId: v })}
                    options={categories.map((c) => ({ value: c.id, label: c.name }))}
                    placeholder="No category"
                  />
                </Field>
                <Field label="Channel naming pattern" hint={`{number} becomes the ticket number, {username} becomes the opener's name. Example: "ticket-{number}" → ticket-0007`}>
                  <input className="input" value={form.namingPattern} onChange={set("namingPattern")} />
                </Field>
                <Field label="Max open tickets per user" hint="Blocks someone from opening another ticket on this panel while they already have one open.">
                  <input type="number" min={1} className="input" value={form.maxOpenPerUser} onChange={set("maxOpenPerUser")} />
                </Field>
                <Field
                  label="Welcome message"
                  hint="Shown INSIDE the ticket once it's opened — different from the embed description above, which is the panel announcement people see before clicking the button."
                >
                  <textarea className="input" rows={2} value={form.welcomeMessage} onChange={set("welcomeMessage")} />
                </Field>
                <Field label="Footer text" hint="Small text shown at the bottom of that same welcome message.">
                  <input className="input" value={form.footerText} onChange={set("footerText")} />
                </Field>
                <Field
                  label="Which staff can access this panel's tickets"
                  hint="Leave empty to use everyone on your Staff Roles list, same as before. Pick specific roles here to restrict just this panel — handy for department-specific panels like Billing that shouldn't be visible to your general support team."
                >
                  <RoleMultiSelect
                    roles={roles}
                    selected={form.accessRoleIds || []}
                    onChange={(ids) => setForm({ ...form, accessRoleIds: ids })}
                  />
                </Field>

                <Toggle
                  checked={form.tagStaffOnOpen !== false}
                  onChange={(v) => setForm({ ...form, tagStaffOnOpen: v })}
                  label="Tag staff roles when a ticket opens"
                />
                <p className="text-xs text-gray-500 -mt-2 ml-[3.15rem]">
                  Staff always get access to the channel either way — this only controls whether they also get pinged.
                </p>
                <Field
                  label="Other roles to ping when a ticket opens"
                  hint="Pick any roles — doesn't have to be your main support team. Useful for event-specific staff who only need to see tickets tied to their own event. Always pings regardless of the staff toggle above."
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
              <SectionHeading icon={UserCog} title="Roles on ticket actions" accent="cyan" />
              <p className="text-xs text-gray-500 mb-3">
                Automatically add or remove roles from the person who opened the ticket. Useful for application-style
                panels — e.g. remove a "Pending" role and add a "Member" role when you close (accept) their ticket.
              </p>
              <div className="space-y-3">
                <Field label="Add roles when the ticket opens" hint="Granted to whoever opened the ticket, the moment it's created.">
                  <RoleMultiSelect
                    roles={roles}
                    selected={form.openAddRoleIds || []}
                    onChange={(ids) => setForm({ ...form, openAddRoleIds: ids })}
                  />
                </Field>
                <Field label="Add roles when the ticket closes" hint="Granted to the opener when the ticket is closed — the 'approved' outcome for an application panel.">
                  <RoleMultiSelect
                    roles={roles}
                    selected={form.closeAddRoleIds || []}
                    onChange={(ids) => setForm({ ...form, closeAddRoleIds: ids })}
                  />
                </Field>
                <Field label="Remove roles when the ticket closes" hint="Taken away from the opener when the ticket is closed — e.g. a temporary 'Pending' or 'Applicant' role.">
                  <RoleMultiSelect
                    roles={roles}
                    selected={form.closeRemoveRoleIds || []}
                    onChange={(ids) => setForm({ ...form, closeRemoveRoleIds: ids })}
                  />
                </Field>
              </div>
            </Card>

            <Card>
              <SectionHeading icon={FileText} title="Transcript" />
              <div className="space-y-3">
                <Toggle checked={form.transcriptEnabled} onChange={(v) => setForm({ ...form, transcriptEnabled: v })} label="Save a transcript when tickets close" />

                {form.transcriptEnabled && (
                  <>
                    <Field label="Send transcript to">
                      <Select
                        value={form.transcriptDestination}
                        onChange={(v) => setForm({ ...form, transcriptDestination: v })}
                        options={[
                          { value: "dm", label: "DM the ticket opener" },
                          { value: "channel", label: "Post in a channel" },
                          { value: "both", label: "Both" },
                        ]}
                      />
                    </Field>

                    {(form.transcriptDestination === "channel" || form.transcriptDestination === "both") && (
                      <Field label="Transcript channel">
                        <Select
                          value={form.transcriptChannelId || ""}
                          onChange={(v) => setForm({ ...form, transcriptChannelId: v })}
                          options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
                          placeholder="Select a channel…"
                        />
                      </Field>
                    )}
                  </>
                )}
              </div>
            </Card>

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg font-medium disabled:opacity-50 shadow-lg shadow-cyan-500/10"
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
                  <Send size={15} className="text-cyan-400" />
                  <h3 className="font-semibold text-gray-200 text-sm">Send to Discord</h3>
                </div>
                <p className="text-xs text-gray-500">
                  Post this panel's button in a channel — updates the same message next time if it's already been sent there.
                </p>
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
                    disabled={!sendChannelId || sending}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg text-sm font-medium disabled:opacity-40 whitespace-nowrap"
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
                    Currently posted in #{textChannels.find((c) => c.id === form.channelId)?.name || "a channel"} —
                    sending to that same channel again updates it in place instead of posting a duplicate.
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
                  className="mt-4 px-4 py-2 rounded text-white text-sm font-medium flex items-center gap-1.5"
                  style={{ backgroundColor: BUTTON_COLORS[form.buttonStyle] || BUTTON_COLORS.Primary }}
                >
                  {/^[\w~]+:\d{15,21}$/.test(form.buttonEmoji || "") ? (
                    <img src={`https://cdn.discordapp.com/emojis/${form.buttonEmoji.split(":")[1]}.png?size=32`} className="w-4 h-4" alt="" />
                  ) : (
                    form.buttonEmoji
                  )}
                  {form.buttonLabel}
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

            <Card title="When the ticket opens…" actions={<span className="text-xs text-gray-500">What's shown inside</span>}>
              <div className="bg-[#313338] rounded-lg p-4 border-l-4" style={{ borderColor: form.embedColor }}>
                <p className="font-bold text-white text-sm">Ticket #0001</p>
                <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">{form.welcomeMessage}</p>
                <p className="text-gray-500 text-xs mt-2">{form.footerText}</p>
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
      <Icon size={15} className="text-cyan-400" />
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
            <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
          </Tooltip>
        )}
      </span>
      {children}
    </label>
  );
}
