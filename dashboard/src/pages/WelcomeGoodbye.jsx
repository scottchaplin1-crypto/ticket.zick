import { useEffect, useState } from "react";
import { LogIn, LogOut, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import Toggle from "../components/Toggle.jsx";

const PLACEHOLDER_HINT =
  "{user} mentions them, {username} is their plain name, {membercount} is the server's member count, {server} is the server name.";

export default function WelcomeGoodbye({ guildId }) {
  const [form, setForm] = useState(null);
  const [channels, setChannels] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/api/welcome/guild/${guildId}`).then((res) => setForm(res.data));
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
  }, [guildId]);

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const textChannels = channels.filter((c) => c.type === 0);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function save() {
    setSaving(true);
    try {
      const { data } = await api.put(`/api/welcome/guild/${guildId}`, form);
      setForm(data);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome &amp; Goodbye</h1>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <LogIn size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Welcome messages</h3>
          </div>
          <div className="space-y-3">
            <Toggle checked={form.welcomeEnabled} onChange={(v) => setForm({ ...form, welcomeEnabled: v })} label="Post a message when someone joins" />
            {form.welcomeEnabled && (
              <>
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Channel</span>
                  <select className="input" value={form.welcomeChannelId || ""} onChange={set("welcomeChannelId")}>
                    <option value="">Select a channel…</option>
                    {textChannels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    Message
                    <Tooltip text={PLACEHOLDER_HINT}>
                      <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                    </Tooltip>
                  </span>
                  <textarea className="input" rows={3} value={form.welcomeMessage} onChange={set("welcomeMessage")} />
                </label>
              </>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <LogOut size={15} className="text-blurple" />
            <h3 className="font-semibold text-gray-200 text-sm">Goodbye messages</h3>
          </div>
          <div className="space-y-3">
            <Toggle checked={form.goodbyeEnabled} onChange={(v) => setForm({ ...form, goodbyeEnabled: v })} label="Post a message when someone leaves" />
            {form.goodbyeEnabled && (
              <>
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Channel</span>
                  <select className="input" value={form.goodbyeChannelId || ""} onChange={set("goodbyeChannelId")}>
                    <option value="">Select a channel…</option>
                    {textChannels.map((c) => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                </label>
                <p className="text-xs text-gray-500">
                  Tip: to keep this private (staff-only), set this to a channel you've already restricted with Discord's
                  own permissions — the bot just posts wherever you point it.
                </p>
                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    Message
                    <Tooltip text={PLACEHOLDER_HINT}>
                      <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                    </Tooltip>
                  </span>
                  <textarea className="input" rows={3} value={form.goodbyeMessage} onChange={set("goodbyeMessage")} />
                </label>
              </>
            )}
          </div>
        </Card>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full mt-6 py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
