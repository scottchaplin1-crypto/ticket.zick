import { useEffect, useState } from "react";
import { LogIn, LogOut, Info, ImageIcon, UserCog } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";
import Toggle from "../components/Toggle.jsx";
import Select from "../components/Select.jsx";
import RoleMultiSelect from "../components/RoleMultiSelect.jsx";
import SaveStatus from "../components/SaveStatus.jsx";
import ImageUrlField from "../components/ImageUrlField.jsx";
import { useAutoSave } from "../hooks/useAutoSave.js";

const PLACEHOLDER_HINT =
  "{user} mentions them, {username} is their plain name, {membercount} is the server's member count, {server} is the server name.";

const BANNER_TITLE_HINT =
  "{username}, {membercount}, and {server} all work here. Skip {user} for this one — it's drawn onto an image, so a Discord mention would just show up as raw text like <@123456789> instead of actually pinging them.";

const AUTO_ROLE_HINT =
  "If your server uses Discord's own \"Apply to Join\" feature, this is effectively \"roles for approved applicants\" — Discord doesn't add someone as a real member here until staff approve their application, so this fires at that exact moment.";

export default function WelcomeGoodbye({ guildId }) {
  const [form, setForm] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    api.get(`/api/welcome/guild/${guildId}`).then((res) => {
      let autoRoleIds = [];
      try {
        autoRoleIds = JSON.parse(res.data.autoRoleIds || "[]");
      } catch {
        autoRoleIds = [];
      }
      setForm({ ...res.data, autoRoleIds });
    });
    api.get(`/api/guilds/${guildId}/channels`).then((res) => setChannels(res.data)).catch(() => setChannels([]));
    api.get(`/api/guilds/${guildId}/roles`).then((res) => setRoles(res.data)).catch(() => setRoles([]));
  }, [guildId]);

  const status = useAutoSave(
    form,
    () => api.put(`/api/welcome/guild/${guildId}`, { ...form, autoRoleIds: JSON.stringify(form.autoRoleIds) }),
    { enabled: !!form, resetKey: guildId }
  );

  if (!form) return <p className="text-gray-500">Loading…</p>;

  const channelOptions = channels.filter((c) => c.type === 0).map((c) => ({ value: c.id, label: `#${c.name}` }));
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Welcome &amp; Goodbye</h1>
        <SaveStatus status={status} />
      </div>

      <div className="mb-6">
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <UserCog size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Auto-role on join</h3>
          </div>
          <div className="space-y-3">
            <Toggle
              checked={form.autoRoleEnabled}
              onChange={(v) => setForm({ ...form, autoRoleEnabled: v })}
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
                <RoleMultiSelect roles={roles} selected={form.autoRoleIds} onChange={(ids) => setForm({ ...form, autoRoleIds: ids })} />
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
            <Toggle checked={form.welcomeEnabled} onChange={(v) => setForm({ ...form, welcomeEnabled: v })} label="Post a message when someone joins" />
            {form.welcomeEnabled && (
              <>
                <label className="block">
                  <span className="block text-xs text-gray-400 mb-1">Channel</span>
                  <Select
                    value={form.welcomeChannelId || ""}
                    onChange={(v) => setForm({ ...form, welcomeChannelId: v })}
                    options={channelOptions}
                    placeholder="Select a channel…"
                  />
                </label>

                <div className="pt-1 border-t border-white/5">
                  <Toggle
                    checked={form.bannerEnabled}
                    onChange={(v) => setForm({ ...form, bannerEnabled: v })}
                    label="Use a generated image banner"
                  />
                  {form.bannerEnabled && (
                    <div className="space-y-3 mt-3">
                      <ImageUrlField
                        label="Background image"
                        value={form.bannerImageUrl}
                        onChange={(v) => setForm({ ...form, bannerImageUrl: v })}
                        placeholder="Paste a wide background image link…"
                      />
                      <label className="block">
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                          Banner title text
                          <Tooltip text={BANNER_TITLE_HINT}>
                            <Info size={12} className="text-gray-600 hover:text-cyan-400 transition cursor-help" />
                          </Tooltip>
                        </span>
                        <input className="input" value={form.bannerTitleTemplate} onChange={set("bannerTitleTemplate")} />
                      </label>
                      <p className="text-xs text-gray-500 flex items-start gap-1.5">
                        <ImageIcon size={12} className="shrink-0 mt-0.5" />
                        Generates a real image — their avatar in a circle, this title, and the member count, drawn onto
                        your background. If generation ever fails (bad image link, etc.), the plain message below posts
                        instead automatically, so joiners are never left with nothing.
                      </p>

                      {form.bannerImageUrl && (
                        <div className="rounded-lg overflow-hidden relative h-28 bg-surface3">
                          <img src={form.bannerImageUrl} className="w-full h-full object-cover absolute inset-0" onError={(e) => (e.currentTarget.style.display = "none")} />
                          <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1.5 px-3">
                            <div className="w-9 h-9 rounded-full bg-surface2 border-2 border-white" />
                            <p className="text-white text-xs font-bold text-center">
                              {form.bannerTitleTemplate?.replace("{username}", "NewMember").replace("{membercount}", "42").replace("{server}", "Your Server")}
                            </p>
                            <p className="text-cyan-300 text-[10px]">Member #42</p>
                          </div>
                        </div>
                      )}
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
                  <Select
                    value={form.goodbyeChannelId || ""}
                    onChange={(v) => setForm({ ...form, goodbyeChannelId: v })}
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
                </label>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
