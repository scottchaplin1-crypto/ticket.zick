import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import Logo from "../components/Logo.jsx";

export default function GuildSelect({ user }) {
  const [guilds, setGuilds] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/api/guilds").then((res) => setGuilds(res.data));
  }, []);

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

      <h2 className="text-lg text-gray-200 font-medium mb-1">Choose a server</h2>
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
        <p className="text-gray-500">
          No manageable servers found. You need Manage Server permission on a server the bot is invited to.
        </p>
      )}
    </div>
  );
}
