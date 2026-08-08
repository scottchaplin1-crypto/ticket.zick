import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, Info, ImageIcon, UserCog } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import Toggle from "../components/Toggle.jsx";
import Select from "../components/Select.jsx";
import RoleMultiSelect from "../components/RoleMultiSelect.jsx";
import ImageUrlField from "../components/ImageUrlField.jsx";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";
import PremiumGate from "../components/PremiumGate.jsx";

const KNOWN_PLACEHOLDERS = ["{user}", "{username}", "{membercount}", "{server}"];

// Flags anything that looks like a placeholder (curly braces) but isn't one we
// actually support — catches typos like {user.idname} before they ship instead
// of silently showing up as literal text in the real message.
function findUnknownPlaceholders(text) {
  const matches = (text || "").match(/\{[^}]+\}/g) || [];
  return [...new Set(matches.filter((m) => !KNOWN_PLACEHOLDERS.includes(m)))];
}

function PlaceholderWarning({ text }) {
  const unknown = findUnknownPlaceholders(text);
  if (unknown.length === 0) return null;
  return (
    <p className="text-xs text-amber-400 mt-1">
      {unknown.join(", ")} {unknown.length === 1 ? "isn't" : "aren't"} a real placeholder — it'll show up as literal
      text. Valid ones: {KNOWN_PLACEHOLDERS.join(", ")}.
    </p>
  );
}

const PLACEHOLDER_HINT =
  "{user} mentions them, {username} is their plain name, {membercount} is the server's member count, {server} is the server name.";

const BANNER_TITLE_HINT =
  "{username}, {membercount}, and {server} all work here. Skip {user} for this one — it's drawn onto an image, so a Discord mention would just show up as raw text like <@123456789> instead of actually pinging them.";

const AUTO_ROLE_HINT =
  "If your server uses Discord's own \"Apply to Join\" feature, this is effectively \"roles for approved applicants\" — Discord doesn't add someone as a real member here until staff approve their application, so this fires at that exact moment.";

export default function WelcomeGoodbye({ guildId }) {
  return (
    <PremiumGate guildId={guildId} feature="Welcome & Goodbye">
      <WelcomeGoodbyeContent guildId={guildId} />
    </PremiumGate>
  );
}

function WelcomeGoodbyeContent({ guildId }) {
  const [form, setForm] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { isDirty, setDirty } = useUnsavedChanges();
  const baselineRef = useRef(null);

  useEffect(() => {
    api
      .get(`/api/welcome/guild/${guildId}`)
      .then((res) => {
        let autoRoleIds = [];
        try {
          autoRoleIds = JSON.parse(res.data.autoRoleIds || "[]");
        } catch {
          autoRoleIds = [];
        }
        const data = { ...res.data, autoRoleIds };
        setForm(data);
        baselineRef.current = JSON.stringify(data);
      })
      .catch(() => {
        // Most commonly a 402 from the server-side paywall on an unsubscribed
        // guild — falls back to a blank config (same shape the server itself
        // uses) so the page can still render instead of hanging forever.
        const blank = {
          welcomeEnabled: false, welcomeChannelId: null,
          welcomeMessage: "Welcome {user} to {server}! We're now {membercount} members strong. 🎉",
          autoRoleEnabled: false, autoRoleIds: [],
          bannerEnabled: false, bannerImageUrl: null,
          bannerBackgroundColor: "#2b2d31", bannerTextColor: "#ffffff", bannerAccentColor: "#5ee6c8",
          bannerOverlayOpacity: 45, bannerTitleTemplate: "{username} just joined the server!",
          goodbyeEnabled: false, goodbyeChannelId: null, goodbyeMessage: "{username} has left {server}.",
        };
        setForm(blank);
        baselineRef.current = JSON.stringify(blank);
      });
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
  }, [guildId]);

  useEffect(() => {
    if (!form) return;
    setDirty(JSON.stringify(form) !== baselineRef.current);
  }, [form]);

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const channelOptions = channels.filter((c) => c.type === 0).map((c) => ({ value: c.id, label: `#${c.name}` }));

  function update(patch) {
    setForm({ ...form, ...patch });
    setSaved(false);
  }
  const set = (key) => (e) => update({ [key]: e.target.value });

  async function save() {
    setSaving(true);
    try {
      await api.put(`/api/welcome/guild/${guildId}`, { ...form, autoRoleIds: JSON.stringify(form.autoRoleIds) });
      baselineRef.current = JSON.stringify(form);
      setDirty(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Welcome &amp; Goodbye</h1>
        {isDirty && <p className="text-xs text-amber-400">You have unsaved changes</p>}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        What happens when someone joins or leaves — messages, an automatic role, and an optional generated
        banner image.
      </p>

      <div className="mb-6">
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <UserCog size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Auto-role on join</h3>
          </div>
          <div className="space-y-3">
            <Toggle
              checked={form.autoRoleEnabled}
              onChange={(v) => update({ autoRoleEnabled: v })}
              label="Give roles automatically the moment someone joins"
            />
            {form.autoRoleEnabled && (
              <label className="block">
                <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                  Roles to grant
                  <Tooltip text={AUTO_ROLE_HINT}>
                    <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                  </Tooltip>
                </span>
                <RoleMultiSelect roles={roles} selected={form.autoRoleIds} onChange={(ids) => update({ autoRoleIds: ids })} />
              </label>
            )}
            <p className="text-xs text-gray-500">
              Independent of the welcome message below — you can use one without the other, or both together.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <LogIn size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Welcome messages</h3>
          </div>
          <div className="space-y-3">
            <Toggle checked={form.welcomeEnabled} onChange={(v) => update({ welcomeEnabled: v })} label="Post a message when someone joins" />
            {form.welcomeEnabled && (
              <>
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Channel</span>
                  <Select
                    value={form.welcomeChannelId || ""}
                    onChange={(v) => update({ welcomeChannelId: v })}
                    options={channelOptions}
                    placeholder="Select a channel…"
                  />
                </label>

                <div className="pt-1 border-t border-white/5">
                  <Toggle
                    checked={form.bannerEnabled}
                    onChange={(v) => update({ bannerEnabled: v })}
                    label="Use a generated image banner"
                  />
                  {form.bannerEnabled && (
                    <div className="space-y-3 mt-3">
                      <ImageUrlField
                        label="Background image (optional)"
                        value={form.bannerImageUrl}
                        onChange={(v) => update({ bannerImageUrl: v })}
                        placeholder="Leave blank to use a flat color instead…"
                      />

                      <div className="grid grid-cols-3 gap-3">
                        <label className="block">
                          <span className="block text-xs text-gray-400 mb-1">
                            {form.bannerImageUrl ? "Fallback color" : "Background color"}
                          </span>
                          <input type="color" className="input h-9 w-full px-1" value={form.bannerBackgroundColor} onChange={set("bannerBackgroundColor")} />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-gray-400 mb-1">Text color</span>
                          <input type="color" className="input h-9 w-full px-1" value={form.bannerTextColor} onChange={set("bannerTextColor")} />
                        </label>
                        <label className="block">
                          <span className="block text-xs text-gray-400 mb-1">Accent color</span>
                          <input type="color" className="input h-9 w-full px-1" value={form.bannerAccentColor} onChange={set("bannerAccentColor")} />
                        </label>
                      </div>

                      {form.bannerImageUrl && (
                        <label className="block">
                          <span className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>Overlay darkness</span>
                            <span>{form.bannerOverlayOpacity}%</span>
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            className="w-full accent-cyan-400"
                            value={form.bannerOverlayOpacity}
                            onChange={set("bannerOverlayOpacity")}
                          />
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            A dark wash over the image so text stays readable — lower it for a busy or already-dark image, raise it for a bright one.
                          </p>
                        </label>
                      )}

                      <label className="block">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          Banner title text
                          <Tooltip text={BANNER_TITLE_HINT}>
                            <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                          </Tooltip>
                        </span>
                        <input className="input" value={form.bannerTitleTemplate} onChange={set("bannerTitleTemplate")} />
                        <PlaceholderWarning text={form.bannerTitleTemplate} />
                      </label>
                      <p className="text-xs text-gray-500 flex items-start gap-1.5">
                        <ImageIcon size={12} className="shrink-0 mt-0.5" />
                        Generates a real image — their avatar in a circle, this title, and the member count. If
                        generation ever fails (bad image link, etc.), the plain message below posts instead
                        automatically, so joiners are never left with nothing.
                      </p>

                      <div
                        className="rounded-lg overflow-hidden relative h-28"
                        style={{ backgroundColor: form.bannerBackgroundColor }}
                      >
                        {form.bannerImageUrl && (
                          <>
                            <img
                              src={form.bannerImageUrl}
                              className="w-full h-full object-cover absolute inset-0"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                            <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${form.bannerOverlayOpacity / 100})` }} />
                          </>
                        )}
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3">
                          <div className="w-9 h-9 rounded-full bg-surface2 border-2 border-white" />
                          <p className="text-xs font-bold text-center" style={{ color: form.bannerTextColor }}>
                            {form.bannerTitleTemplate?.replace("{username}", "NewMember").replace("{membercount}", "42").replace("{server}", "Your Server")}
                          </p>
                          <p className="text-[10px]" style={{ color: form.bannerAccentColor }}>Member #42</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <label className="block">
                  <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    Message {form.bannerEnabled && <span className="text-gray-600">(fallback if the banner fails)</span>}
                    <Tooltip text={PLACEHOLDER_HINT}>
                      <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                    </Tooltip>
                  </span>
                  <textarea className="input" rows={3} value={form.welcomeMessage} onChange={set("welcomeMessage")} />
                  <PlaceholderWarning text={form.welcomeMessage} />
                </label>
              </>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <LogOut size={15} className="text-cyan-300" />
            <h3 className="font-semibold text-gray-200 text-sm">Goodbye messages</h3>
          </div>
          <div className="space-y-3">
            <Toggle checked={form.goodbyeEnabled} onChange={(v) => update({ goodbyeEnabled: v })} label="Post a message when someone leaves" />
            {form.goodbyeEnabled && (
              <>
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Channel</span>
                  <Select
                    value={form.goodbyeChannelId || ""}
                    onChange={(v) => update({ goodbyeChannelId: v })}
                    options={channelOptions}
                    placeholder="Select a channel…"
                  />
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
                  <PlaceholderWarning text={form.goodbyeMessage} />
                </label>
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 max-w-md">
        {saved && <p className="text-xs text-green-400 mb-2">Saved.</p>}
        <button
          onClick={save}
          disabled={saving}
          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
