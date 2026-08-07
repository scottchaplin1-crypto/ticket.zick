import { useEffect, useState } from "react";
import { Swords, Plus, Trash2, Send, CheckCircle2, RefreshCw, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Select from "../components/Select.jsx";
import Toggle from "../components/Toggle.jsx";
import Tooltip from "../components/Tooltip.jsx";

const BLANK = { enabled: true, womGroupId: "", womGroupName: "", linkChannelId: "", rankMappings: [] };

export default function OsrsSync({ guildId }) {
  const [form, setForm] = useState(null);
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sendChannelId, setSendChannelId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [links, setLinks] = useState([]);

  function loadLinks() {
    api.get(`/api/osrs-sync/guild/${guildId}/links`).then((res) => setLinks(res.data));
  }

  useEffect(() => {
    loadLinks();
  }, [guildId]);

  async function unlink(discordId) {
    if (!confirm("Remove this link? This doesn't remove their current Discord role — just stops tracking them.")) return;
    await api.delete(`/api/osrs-sync/guild/${guildId}/links/${discordId}`);
    loadLinks();
  }

  useEffect(() => {
    api.get(`/api/osrs-sync/guild/${guildId}`).then((res) =>
      setForm({
        ...BLANK,
        ...res.data,
        rankMappings: JSON.parse(res.data.rankMappings || "[]"),
      })
    );
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
  }, [guildId]);

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const textChannels = channels.filter((c) => c.type === 0);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.put(`/api/osrs-sync/guild/${guildId}`, {
        ...form,
        rankMappings: JSON.stringify(form.rankMappings),
      });
      setForm({ ...form, womGroupName: data.womGroupName });
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save — check the group ID and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function sendPanel() {
    if (!sendChannelId) return;
    setSending(true);
    setSendResult(null);
    try {
      await api.post(`/api/osrs-sync/guild/${guildId}/send`, { channelId: sendChannelId });
      setSendResult({ ok: true, message: `Sent to #${textChannels.find((c) => c.id === sendChannelId)?.name}` });
    } catch (err) {
      setSendResult({ ok: false, message: err.response?.data?.error || "Couldn't send the panel." });
    } finally {
      setSending(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post(`/api/osrs-sync/guild/${guildId}/sync-now`);
      setSyncResult(data);
      loadLinks();
    } finally {
      setSyncing(false);
    }
  }

  function addMapping() {
    setForm({ ...form, rankMappings: [...form.rankMappings, { womRole: "", roleId: "" }] });
  }
  function updateMapping(i, key, value) {
    const rankMappings = [...form.rankMappings];
    rankMappings[i] = { ...rankMappings[i], [key]: value };
    setForm({ ...form, rankMappings });
  }
  function removeMapping(i) {
    setForm({ ...form, rankMappings: form.rankMappings.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">OSRS Rank Sync</h1>
      <p className="text-sm text-gray-500 mb-6">
        Links members' Old School RuneScape accounts (via Wise Old Man) to Discord roles matching their current clan
        rank — kept in sync automatically. Niche, optional — leave it off if you don't run an OSRS clan.
      </p>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
              <Swords size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Wise Old Man group</h3>
            </div>
            <div className="space-y-3">
              <Toggle checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Enabled" />
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  Group ID
                  <Tooltip text="The numeric ID from your group's Wise Old Man URL — wiseoldman.net/groups/12345, the ID is 12345.">
                    <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                  </Tooltip>
                </span>
                <input className="input" value={form.womGroupId} onChange={(e) => setForm({ ...form, womGroupId: e.target.value })} placeholder="e.g. 13766" />
              </label>
              {form.womGroupName && (
                <p className="text-xs text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Connected to "{form.womGroupName}"
                </p>
              )}
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button onClick={save} disabled={saving} className="w-full py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </Card>

          <Card title="Rank → Role mappings">
            <p className="text-xs text-gray-500 mb-3">
              Type the exact rank name as it appears in your Wise Old Man group's member list (case-sensitive, e.g.{" "}
              <code>jade</code>, <code>onyx</code>) — your clan's ranks are custom, so there's no fixed list to pick
              from.
            </p>
            <div className="space-y-2">
              {form.rankMappings.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface3 rounded-lg p-2">
                  <input
                    className="input h-9 text-sm flex-1"
                    placeholder="WOM rank (e.g. onyx)"
                    value={m.womRole}
                    onChange={(e) => updateMapping(i, "womRole", e.target.value)}
                  />
                  <div className="flex-1">
                    <Select
                      value={m.roleId}
                      onChange={(v) => updateMapping(i, "roleId", v)}
                      options={roles.map((r) => ({
                        value: r.id,
                        label: r.name,
                        color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "#99AAB5",
                      }))}
                      placeholder="Discord role…"
                    />
                  </div>
                  <button onClick={() => removeMapping(i)} className="text-gray-500 hover:text-red-400 transition shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {form.rankMappings.length === 0 && <p className="text-sm text-gray-500 italic">No mappings yet.</p>}
              <button
                onClick={addMapping}
                className="w-full py-2 border border-dashed border-white/15 hover:border-cyan-400 hover:text-cyan-400 transition rounded-lg text-sm text-gray-400 flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add mapping
              </button>
            </div>
            <button onClick={save} disabled={saving} className="w-full mt-3 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50 text-sm">
              {saving ? "Saving…" : "Save mappings"}
            </button>
          </Card>

          <div className="bg-surface2 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Send size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Send link panel</h3>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={sendChannelId} onChange={setSendChannelId} options={textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))} placeholder="Select a channel…" />
              </div>
              <button onClick={sendPanel} disabled={!sendChannelId || sending} className="px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium disabled:opacity-40 whitespace-nowrap">
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
            {sendResult && (
              <p className={`text-xs flex items-center gap-1.5 ${sendResult.ok ? "text-green-400" : "text-red-400"}`}>
                {sendResult.ok && <CheckCircle2 size={12} />}
                {sendResult.message}
              </p>
            )}
          </div>

          <div className="bg-surface2 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw size={15} className="text-cyan-400" />
              <h3 className="font-semibold text-gray-200 text-sm">Manual sync</h3>
            </div>
            <p className="text-xs text-gray-500">Roles sync automatically every 30 minutes — use this to check right now instead of waiting.</p>
            <button onClick={syncNow} disabled={syncing} className="w-full py-2 bg-surface3 hover:bg-white/10 transition rounded-lg text-sm font-medium disabled:opacity-50">
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            {syncResult && (
              <p className="text-xs text-gray-400">
                {syncResult.skipped
                  ? "Sync isn't fully set up yet."
                  : syncResult.error
                  ? syncResult.error
                  : `Checked ${syncResult.checked} linked member(s), updated ${syncResult.updated}${syncResult.notFound ? `, ${syncResult.notFound} not found in the clan` : ""}.`}
              </p>
            )}
          </div>

          <Card title={`Linked accounts (${links.length})`}>
            <div className="divide-y divide-white/5">
              {links.map((link) => (
                <div key={link.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-200">
                      {link.displayName ? (
                        link.displayName
                      ) : link.leftServer ? (
                        <span className="text-gray-500 italic">Left the server</span>
                      ) : (
                        <span className="text-gray-500 italic">Unknown (couldn't verify right now)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {link.rsn} {link.lastRole && <>· {link.lastRole}</>}
                    </p>
                  </div>
                  <button onClick={() => unlink(link.discordId)} className="text-red-400 text-xs hover:underline">
                    Unlink
                  </button>
                </div>
              ))}
              {links.length === 0 && <p className="text-sm text-gray-500">No one has linked their account yet.</p>}
            </div>
          </Card>
        </div>

        <div className="sticky top-6">
          <Card title="Live preview">
            <div className="bg-[#313338] rounded-lg p-4 border-l-4" style={{ borderColor: "#5865F2" }}>
              <p className="text-white font-bold">Link your OSRS account</p>
              <p className="text-gray-300 text-sm mt-1">
                Click below and enter your in-game name to link your account
                {form.womGroupName ? ` with ${form.womGroupName}` : ""}. Your Discord role will automatically match
                your current clan rank.
              </p>
              <button className="mt-4 px-4 py-2 rounded bg-blurple text-white text-sm font-medium">⚔️ Link RSN</button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
