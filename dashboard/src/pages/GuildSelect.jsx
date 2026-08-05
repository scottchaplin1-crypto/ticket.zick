import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { api } from "../api/client.js";
import Logo from "../components/Logo.jsx";

// Same permission set used when the bot was first invited manually — Manage
// Channels, Manage Roles, Send Messages, Embed Links, Attach Files, Read Message
// History, View Channels. Recomputing this by hand is error-prone, so it's a fixed
// constant here rather than something built from a list every render.
const BOT_INVITE_PERMISSIONS = 268553232;

export default function GuildSelect({ user }) {
  const [guilds, setGuilds] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/guilds").then((res) => setGuilds(res.data));
  }, []);

  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${BOT_INVITE_PERMISSIONS}&scope=${encodeURIComponent(
    "bot applications.commands"
  )}`;

  async function openGuild(guild) {
    if (!guild.isSetUp) {
      await api.post(`/api/guilds/${guild.id}/setup`, { name: guild.name, icon: guild.icon });
    }
    navigate(`/guild/${guild.id}`);
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto py-16 px-4">
      <div className="flex items-center justify-between mb-10">
        <Logo size={34} />
        <span className="text-gray-400 text-sm">Signed in as {user.username}</span>
      </div>

      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg text-gray-200 font-medium">Choose a server</h2>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium shadow-lg shadow-blurple/10"
        >
          <UserPlus size={15} />
          Invite bot to a server
        </a>
      </div>
      <p className="text-sm text-gray-500 mb-5">Pick a server to manage its ticket panels and settings.</p>

      {!guilds && <p className="text-gray-500">Loading your servers…</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {guilds?.map((g) => (
          <button
            key={g.id}
            onClick={() => openGuild(g)}
            className="bg-surface2 hover:bg-surface3 border border-white/5 hover:border-white/10 transition rounded-xl p-4 flex flex-col items-center gap-2 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-surface3 flex items-center justify-center overflow-hidden">
              {g.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{g.name[0]}</span>
              )}
            </div>
            <span className="text-sm font-medium truncate w-full">{g.name}</span>
            <span className={`text-xs flex items-center gap-1 ${g.isSetUp ? "text-green-400" : "text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${g.isSetUp ? "bg-green-400" : "bg-gray-600"}`} />
              {g.isSetUp ? "Configured" : "Not set up yet"}
            </span>
          </button>
        ))}
      </div>

      {guilds && guilds.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500 mb-4">
            No manageable servers found yet. Invite the bot to a server you manage, then it'll show up here.
          </p>
          <a
            href={inviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blurple hover:bg-indigo-500 transition rounded-lg text-sm font-medium"
          >
            <UserPlus size={15} />
            Invite bot to a server
          </a>
        </div>
      )}
    </div>
  );
}
