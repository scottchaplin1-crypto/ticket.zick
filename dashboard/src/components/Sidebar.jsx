import { Link, NavLink, useLocation } from "react-router-dom";
import { LayoutGrid, Inbox, Palette, Users, Zap } from "lucide-react";
import Logo from "./Logo.jsx";

const NAV = [
  { to: "tickets", label: "Tickets", icon: Inbox },
  { to: "branding", label: "Branding", icon: Palette },
  { to: "staff", label: "Staff Roles", icon: Users },
  { to: "quick-commands", label: "Quick Commands", icon: Zap },
];

export default function Sidebar({ guildId, guildName }) {
  const location = useLocation();
  const base = `/guild/${guildId}`;
  // "Panels" covers both the panel list (base path) and any selected panel
  // (base/panel/:id), so it needs its own active check instead of NavLink's default.
  const panelsActive = location.pathname === base || location.pathname.startsWith(`${base}/panel/`);
  // Send people back to whichever panel they were last editing, not a blank slate —
  // this is what actually keeps your place when you use the sidebar to leave and return.
  const lastPanelId = localStorage.getItem(`tz:lastPanel:${guildId}`);
  const panelsHref = lastPanelId ? `${base}/panel/${lastPanelId}` : base;
  const itemClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
      active ? "bg-blurple text-white" : "text-gray-300 hover:bg-surface3 hover:text-white"
    }`;

  return (
    <div className="w-60 shrink-0 bg-surface2 min-h-screen p-4 flex flex-col border-r border-white/5">
      <a href="/" className="block mb-6 px-1">
        <Logo size={28} />
      </a>

      <div className="mb-4 px-1">
        <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-0.5">Server</p>
        <h2 className="font-semibold text-gray-100 truncate">{guildName}</h2>
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
