import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, ArrowRight, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import Logo from "../components/Logo.jsx";

// Same permission set the bot was originally invited with — Manage Channels, Manage
// Roles, Send Messages, Embed Links, Attach Files, Read Message History, View
// Channels — kept as a fixed constant rather than recomputed by hand each time.
const BOT_INVITE_PERMISSIONS = 268553232;

function inviteUrlFor(guildId) {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const base = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&scope=${encodeURIComponent(
    "bot applications.commands"
  )}`;
  // guild_id + disable_guild_select pre-picks the server in Discord's own picker,
  // so clicking "Invite" on a specific server card is genuinely one click, not two.
  return guildId ? `${base}&guild_id=${guildId}&disable_guild_select=true` : base;
}

export default function GuildSelect({ user }) {
  const [guilds, setGuilds] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/guilds").then((res) => setGuilds(res.data));
  }, []);

  function openGuild(guild) {
    if (!guild.botPresent) {
      window.open(inviteUrlFor(guild.id), "_blank", "noopener,noreferrer");
      return;
    }
    (async () => {
      if (!guild.isSetUp) {
        await api.post(`/api/guilds/${guild.id}/setup`, { name: guild.name, icon: guild.icon });
      }
      navigate(`/guild/${guild.id}`);
    })();
  }

  const readyGuilds = guilds?.filter((g) => g.botPresent) || [];
  const pendingGuilds = guilds?.filter((g) => !g.botPresent) || [];

  return (
    <div className="min-h-screen max-w-4xl mx-auto py-16 px-4">
      <div className="flex items-center justify-between mb-12">
        <Logo size={38} />
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">Signed in as {user.username}</span>
          <a
            href={inviteUrlFor()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium shadow-lg shadow-blurple/20"
          >
            <UserPlus size={15} />
            Invite bot to a server
          </a>
        </div>
      </div>

      {!guilds && <p className="text-gray-500">Loading your servers…</p>}

      {guilds && readyGuilds.length === 0 && pendingGuilds.length === 0 && (
        <div className="text-center py-16 bg-surface2/60 backdrop-blur-sm border border-white/5 rounded-2xl">
          <Sparkles size={28} className="mx-auto text-cyan-400 mb-3" />
          <p className="text-gray-300 font-medium mb-1">No manageable servers found</p>
          <p className="text-gray-500 text-sm mb-5">You need Manage Server permission on a server to set up Ticket Zick there.</p>
          <a
            href={inviteUrlFor()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium"
          >
            <UserPlus size={15} />
            Invite bot to a server
          </a>
        </div>
      )}

      {readyGuilds.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Your servers</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {readyGuilds.map((g) => (
              <button
                key={g.id}
                onClick={() => openGuild(g)}
                className="group relative bg-surface2/80 backdrop-blur-sm hover:bg-surface3 border border-white/5 hover:border-blurple/40 transition-all duration-200 rounded-2xl p-5 flex flex-col items-center gap-2.5 text-center hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blurple/10"
              >
                <div className="w-16 h-16 rounded-full bg-surface3 ring-2 ring-white/10 group-hover:ring-blurple/50 transition flex items-center justify-center overflow-hidden">
                  {g.icon ? (
                    <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-gray-300">{g.name[0]}</span>
                  )}
                </div>
                <span className="text-sm font-medium truncate w-full">{g.name}</span>
                <span className={`text-xs flex items-center gap-1 ${g.isSetUp ? "text-green-400" : "text-gray-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${g.isSetUp ? "bg-green-400" : "bg-gray-600"}`} />
                  {g.isSetUp ? "Configured" : "Not set up yet"}
                </span>
                <ArrowRight
                  size={14}
                  className="absolute top-4 right-4 text-gray-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 -translate-x-1 transition-all"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {pendingGuilds.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            You manage these too — invite the bot to set them up
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {pendingGuilds.map((g) => (
              <button
                key={g.id}
                onClick={() => openGuild(g)}
                className="group bg-surface2/40 hover:bg-surface2/70 border border-dashed border-white/10 hover:border-cyan-400/40 transition-all duration-200 rounded-2xl p-5 flex flex-col items-center gap-2.5 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-surface3/60 flex items-center justify-center overflow-hidden opacity-70 group-hover:opacity-100 transition">
                  {g.icon ? (
                    <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-semibold text-gray-400">{g.name[0]}</span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-300 truncate w-full">{g.name}</span>
                <span className="text-xs text-cyan-400 flex items-center gap-1">
                  <UserPlus size={11} />
                  Invite bot
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
