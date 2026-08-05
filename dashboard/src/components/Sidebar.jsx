import { NavLink } from "react-router-dom";

export default function Sidebar({ guildId, guildName }) {
  const linkClass = ({ isActive }) =>
    `block px-4 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "bg-blurple text-white" : "text-gray-300 hover:bg-surface3"
    }`;

  return (
    <div className="w-56 shrink-0 bg-surface2 min-h-screen p-4 flex flex-col gap-1">
      <div className="mb-4">
        <a href="/" className="text-xs text-gray-500 hover:text-gray-300">← All servers</a>
        <h2 className="font-bold truncate">{guildName}</h2>
      </div>
      <NavLink end to={`/guild/${guildId}`} className={linkClass}>Panels</NavLink>
      <NavLink to={`/guild/${guildId}/tickets`} className={linkClass}>Tickets</NavLink>
      <NavLink to={`/guild/${guildId}/branding`} className={linkClass}>Branding</NavLink>
      <NavLink to={`/guild/${guildId}/staff`} className={linkClass}>Staff Roles</NavLink>
      <NavLink to={`/guild/${guildId}/quick-commands`} className={linkClass}>Quick Commands</NavLink>
    </div>
  );
}
