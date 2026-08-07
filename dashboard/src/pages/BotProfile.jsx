import { useEffect, useRef, useState } from "react";
import { Bot, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import ImageUrlField from "../components/ImageUrlField.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";

export default function BotProfile({ guildId }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState("");
  const [saved, setSaved] = useState(false);
  const { isDirty, setDirty } = useUnsavedChanges();
  const baselineRef = useRef(null);

  useEffect(() => {
    api.get(`/api/bot-profile/guild/${guildId}`).then((res) => {
      setForm(res.data);
      baselineRef.current = JSON.stringify(res.data);
    });
  }, [guildId]);

  useEffect(() => {
    if (!form) return;
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form]);

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const set = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    setSaved(false);
  };

  async function save() {
    setSaving(true);
    setWarning("");
    setSaved(false);
    try {
      const { data } = await api.put(`/api/bot-profile/guild/${guildId}`, form);
      if (data.discordWarning) {
        setWarning(data.discordWarning);
      } else {
        setSaved(true);
      }
      baselineRef.current = JSON.stringify(form);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Bot Profile</h1>
        {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Changes how Ticket Zick appears specifically in <strong>this</strong> server — its avatar, banner, nickname,
        and bio here. This never affects how it looks in any other server it's in. Discord limits how often the
        avatar/banner specifically can change, so this saves manually rather than automatically.
      </p>

      <div className="grid grid-cols-2 gap-6 items-start">
        <Card>
          <div className="space-y-3">
            <label className="block">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                Nickname
                <Tooltip text="What the bot displays as in this server's member list and messages, instead of its default name. Leave blank to use the default.">
                  <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                </Tooltip>
              </span>
              <input className="input" value={form.nickname || ""} onChange={set("nickname")} placeholder="Ticket Zick" />
            </label>

            <ImageUrlField
              label="Avatar"
              value={form.avatarUrl}
              onChange={(v) => { setForm({ ...form, avatarUrl: v }); setSaved(false); }}
              placeholder="Paste a square image link…"
            />
            <p className="text-xs text-gray-500 -mt-2">Best results: a square image, roughly 1024×1024px.</p>

            <ImageUrlField
              label="Banner"
              value={form.bannerUrl}
              onChange={(v) => { setForm({ ...form, bannerUrl: v }); setSaved(false); }}
              placeholder="Paste a wide image link…"
            />
            <p className="text-xs text-gray-500 -mt-2">Best results: a wide image, roughly 680×240px.</p>

            <label className="block">
              <span className="flex items-center justify-between text-xs text-gray-400 mb-1">
                <span>Bio</span>
                <span className={form.bio?.length > 190 ? "text-red-400" : ""}>{(form.bio || "").length}/190</span>
              </span>
              <textarea
                className="input"
                rows={4}
                maxLength={190}
                value={form.bio || ""}
                onChange={set("bio")}
                placeholder="A short line shown on the bot's profile in this server…"
              />
            </label>

            {warning && (
              <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2">
                {warning}
              </p>
            )}
            {saved && !warning && <p className="text-xs text-green-400">Saved and updated on Discord.</p>}

            <button
              onClick={save}
              disabled={saving}
              className="w-full py-2.5 bg-blurple hover:bg-indigo-500 transition rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Card>

        <div className="sticky top-6">
          <Card title="Live preview">
            <div className="rounded-lg overflow-hidden bg-[#232428]">
              <div className="h-24 w-full bg-surface3 overflow-hidden">
                {form.bannerUrl && (
                  <img
                    src={form.bannerUrl}
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>
              <div className="px-4 pb-4">
                <div className="w-16 h-16 rounded-full bg-surface2 border-4 border-[#232428] overflow-hidden -mt-8 relative z-10 flex items-center justify-center">
                  {form.avatarUrl ? (
                    <img
                      src={form.avatarUrl}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <Bot size={24} className="text-gray-500" />
                  )}
                </div>
                <p className="font-bold text-white mt-2">{form.nickname || "Ticket Zick"}</p>
                <p className="text-xs text-gray-500 mb-2">APP</p>
                {form.bio && <p className="text-sm text-gray-300 whitespace-pre-wrap">{form.bio}</p>}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
