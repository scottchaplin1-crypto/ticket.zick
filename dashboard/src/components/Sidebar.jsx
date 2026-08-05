import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutGrid, Inbox, Palette, Users, Zap, ChevronsUpDown, Check } from "lucide-react";
import { api } from "../api/client.js";
import Logo from "./Logo.jsx";

const NAV = [
  { to: "tickets", label: "Tickets", icon: Inbox },
  { to: "branding", label: "Branding", icon: Palette },
  { to: "staff", label: "Staff Roles", icon: Users },
  { to: "quick-commands", label: "Quick Commands", icon: Zap },
];

export default function Sidebar({ guildId, guildName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const base = `/guild/${guildId}`;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [guilds, setGuilds] = useState(null);
  const switcherRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (switcherRef.current && !switcherRef.current.contains(e.target)) setSwitcherOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function openSwitcher() {
    setSwitcherOpen((o) => !o);
    if (!guilds) api.get("/api/guilds").then((res) => setGuilds(res.data)).catch(() => setGuilds([]));
  }

  async function switchTo(guild) {
    if (!guild.isSetUp) {
      await api.post(`/api/guilds/${guild.id}/setup`, { name: guild.name, icon: guild.icon });
    }
    setSwitcherOpen(false);
    navigate(`/guild/${guild.id}`);
  }

  // "Panels" covers both the panel list (base path) and any selected panel
  // (base/panel/:id), so it needs its own active check instead of NavLink's default.
  const panelsActive = location.pathname === base || location.pathname.startsWith(`${base}/panel/`);
  const lastPanelId = localStorage.getItem(`tz:lastPanel:${guildId}`);
  const panelsHref = lastPanelId ? `${base}/panel/${lastPanelId}` : base;
  const itemClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
      active ? "bg-blurple text-white" : "text-gray-300 hover:bg-surface3 hover:text-white"
    }`;

  return (
    <div className="w-60 shrink-0 bg-surface2 min-h-screen p-4 flex flex-col border-r border-white/5">
      <a href="/" className="block mb-7 px-1">
        <Logo size={32} />
      </a>

      <div className="relative mb-4" ref={switcherRef}>
        <button
          onClick={openSwitcher}
          className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-surface3 transition text-left"
        >
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-cyan-400/70 mb-0.5">Server</p>
            <h2 className="font-semibold text-gray-100 truncate">{guildName}</h2>
          </div>
          <ChevronsUpDown size={14} className="text-gray-500 shrink-0 ml-2" />
        </button>

        {switcherOpen && (
          <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto bg-[#1a1b1e] border border-white/10 rounded-lg shadow-2xl p-1.5">
            {guilds === null && <p className="text-xs text-gray-500 p-2">Loading servers…</p>}
            {guilds?.map((g) => (
              <button
                key={g.id}
                onClick={() => switchTo(g)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface3 transition text-left"
              >
                <div className="w-6 h-6 rounded-full bg-surface3 flex items-center justify-center overflow-hidden shrink-0">
                  {g.icon ? (
                    <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px]">{g.name[0]}</span>
                  )}
                </div>
                <span className="text-sm text-gray-200 truncate flex-1">{g.name}</span>
                {g.id === guildId && <Check size={14} className="text-blurple shrink-0" />}
              </button>
            ))}
            {guilds?.length === 0 && <p className="text-xs text-gray-500 p-2">No other manageable servers found.</p>}
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-1">
        <Link to={panelsHref} className={itemClass(panelsActive)}>
          <LayoutGrid size={16} strokeWidth={2} />
          Panels
        </Link>
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={`${base}/${to}`} className={({ isActive }) => itemClass(isActive)}>
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

      <a href="/" className="mt-auto pt-4 text-xs text-gray-500 hover:text-gray-300 border-t border-white/5">
        ← All servers
      </a>
    </div>
  );
}
