import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutGrid, Inbox, Users, Zap, ChevronsUpDown, Check, UserPlus, Coffee,
  LogIn, SmilePlus, Terminal, Ticket, ChevronDown, Bot, LayoutTemplate, Swords, ShieldBan, Clock3, Coins, Gift, BarChart3,
  UserCog, Sparkles, Wallet, CreditCard, Crown,
} from "lucide-react";
import { api } from "../api/client.js";
import { useUnsavedChanges } from "../context/UnsavedChangesContext.jsx";
import Logo from "./Logo.jsx";
import AdminInviteNote from "./AdminInviteNote.jsx";
import Toggle from "./Toggle.jsx";

import { BOT_INVITE_PERMISSIONS } from "../constants.js";
const INVITE_URL = `https://discord.com/api/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}&permissions=${BOT_INVITE_PERMISSIONS}&scope=${encodeURIComponent("bot applications.commands")}`;
const DONATE_URL = import.meta.env.VITE_DONATE_URL;

// Grouped so the sidebar stays navigable as more modules get added, instead of
// turning into one long list — "Server Tools" had grown to 11 items before this
// split, which is exactly the kind of clutter this structure is meant to avoid.
// `toggleKey` marks the items that have exactly one clean on/off flag we can
// safely surface right here — most pages have several independent settings or no
// single "enabled" concept at all, so not every item gets one.
const GROUPS = [
  {
    label: "Tickets",
    icon: Ticket,
    premium: false,
    items: [
      { to: "", label: "Panels", icon: LayoutGrid, isPanels: true },
      { to: "tickets", label: "Tickets", icon: Inbox },
      { to: "staff", label: "Staff Roles", icon: Users },
      { to: "quick-commands", label: "Quick Commands", icon: Zap, toggleKey: "quickAdd" },
    ],
  },
  {
    // The bot's own identity underlies everything it posts everywhere else, so it
    // gets its own dedicated space rather than being buried in a general list.
    label: "Bot Identity",
    icon: Bot,
    premium: true,
    items: [{ to: "bot-profile", label: "Bot Profile", icon: Bot }],
  },
  {
    label: "Members",
    icon: UserCog,
    premium: true,
    items: [
      { to: "welcome", label: "Welcome & Goodbye", icon: LogIn },
      { to: "osrs-sync", label: "OSRS Rank Sync", icon: Swords, toggleKey: "osrsSync" },
      { to: "moderation", label: "Moderation", icon: ShieldBan },
    ],
  },
  {
    label: "Engagement",
    icon: Sparkles,
    premium: true,
    items: [
      { to: "reaction-roles", label: "Reaction Roles", icon: SmilePlus },
      { to: "commands", label: "Custom Commands", icon: Terminal },
      { to: "embed-messages", label: "Embed Messages", icon: LayoutTemplate },
      { to: "auto-messages", label: "Auto Messages", icon: Clock3 },
      { to: "giveaways", label: "Giveaways", icon: Gift },
      { to: "polls", label: "Polls", icon: BarChart3 },
    ],
  },
  {
    label: "Economy",
    icon: Wallet,
    premium: true,
    items: [{ to: "economy", label: "Economy", icon: Coins }],
  },
];

export default function Sidebar({ guildId, guildName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const base = `/guild/${guildId}`;

  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [subscribed, setSubscribed] = useState(true); // defaults true so nothing flashes as locked before the real check lands

  useEffect(() => {
    api
      .get(`/api/billing/guild/${guildId}/status`)
      .then((res) => setSubscribed(res.data.subscribed))
      .catch(() => setSubscribed(true)); // fail open on the badge — the server routes are the real gate either way
  }, [guildId]);
  const [guilds, setGuilds] = useState(null);
  const switcherRef = useRef(null);
  const { requestNavigation } = useUnsavedChanges();

  // Backing state for the two sidebar toggles — kept as the full config object
  // (not just the boolean) so switching it on/off can PUT back everything else
  // unchanged rather than accidentally wiping other saved settings.
  const [quickAddState, setQuickAddState] = useState(null);
  const [osrsState, setOsrsState] = useState(null);

  useEffect(() => {
    api.get(`/api/guilds/${guildId}`).then((res) =>
      setQuickAddState({
        quickAddEnabled: res.data.quickAddEnabled,
        quickAddCommand: res.data.quickAddCommand,
        quickAddPanelId: res.data.quickAddPanelId,
      })
    );
    api.get(`/api/osrs-sync/guild/${guildId}`).then((res) => setOsrsState(res.data)).catch(() => setOsrsState(null));
  }, [guildId]);

  async function toggleQuickAdd(newValue) {
    if (!quickAddState) return;
    const next = { ...quickAddState, quickAddEnabled: newValue };
    setQuickAddState(next); // optimistic
    try {
      await api.put(`/api/guilds/${guildId}/quick-add`, next);
    } catch {
      setQuickAddState(quickAddState); // revert on failure
    }
  }

  async function toggleOsrsSync(newValue) {
    if (!osrsState) return;
    const next = { ...osrsState, enabled: newValue };
    setOsrsState(next); // optimistic
    try {
      const { data } = await api.put(`/api/osrs-sync/guild/${guildId}`, next);
      setOsrsState(data);
    } catch {
      setOsrsState(osrsState); // revert on failure — e.g. Wise Old Man briefly unreachable
    }
  }

  const TOGGLES = {
    quickAdd: quickAddState && { checked: quickAddState.quickAddEnabled, onChange: toggleQuickAdd },
    osrsSync: osrsState && { checked: osrsState.enabled, onChange: toggleOsrsSync },
  };

  // Every in-app nav link goes through this — always prevents the default click
  // (since confirmation is now async, via the modal, not a blocking window.confirm),
  // then either navigates immediately or waits for the modal's answer.
  function handleNavClick(e, to) {
    e.preventDefault();
    requestNavigation(() => navigate(to));
  }

  // Each group starts open if the current page lives inside it — so you always land
  // with the relevant section expanded, not scrolling through everything collapsed.
  const [openGroups, setOpenGroups] = useState(() =>
    Object.fromEntries(
      GROUPS.map((g) => [g.label, g.items.some((item) => location.pathname === `${base}/${item.to}`.replace(/\/$/, "") || (item.isPanels && (location.pathname === base || location.pathname.startsWith(`${base}/panel/`))))])
    )
  );

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

  function switchTo(guild) {
    requestNavigation(async () => {
      if (!guild.isSetUp) {
        await api.post(`/api/guilds/${guild.id}/setup`, { name: guild.name, icon: guild.icon });
      }
      setSwitcherOpen(false);
      navigate(`/guild/${guild.id}`);
    });
  }

  const lastPanelId = localStorage.getItem(`tz:lastPanel:${guildId}`);
  const panelsHref = lastPanelId ? `${base}/panel/${lastPanelId}` : base;
  const itemClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      active
        ? "bg-cyan-500 text-[#0b1416] shadow-lg shadow-cyan-500/30"
        : "text-gray-300 hover:bg-surface3 hover:text-white hover:shadow-[0_0_16px_rgba(34,211,238,0.15)]"
    }`;

  return (
    <div className="w-64 shrink-0 bg-surface2 min-h-screen p-4 flex flex-col border-r border-white/5">
      <a
        href="/"
        onClick={(e) => handleNavClick(e, "/")}
        className="block -mx-4 -mt-4 mb-6 px-5 py-6 border-b border-white/5 bg-gradient-to-b from-cyan-500/[0.08] via-cyan-500/[0.02] to-transparent hover:from-cyan-500/[0.14] transition-colors duration-200"
      >
        <Logo size={46} />
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
                {g.id === guildId && <Check size={14} className="text-cyan-400 shrink-0" />}
              </button>
            ))}
            {guilds?.length === 0 && <p className="text-xs text-gray-500 p-2">No other manageable servers found.</p>}
          </div>
        )}
      </div>

      <nav className="flex flex-col gap-3 overflow-y-auto">
        {GROUPS.map((group) => {
          const isOpen = openGroups[group.label];
          const GroupIcon = group.icon;
          return (
            <div key={group.label}>
              <button
                onClick={() => setOpenGroups({ ...openGroups, [group.label]: !isOpen })}
                className="w-full flex items-center gap-2 px-1 py-1 text-[11px] uppercase tracking-wide text-gray-500 hover:text-gray-300 transition"
              >
                <GroupIcon size={12} />
                <span className="flex-1 text-left">{group.label}</span>
                {group.premium && !subscribed && <Crown size={11} className="text-amber-400 shrink-0" strokeWidth={2.5} />}
                <ChevronDown size={13} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="flex flex-col gap-1 mt-1">
                  {group.items.map((item) =>
                    item.isPanels ? (
                      <Link
                        key={item.to}
                        to={panelsHref}
                        onClick={(e) => handleNavClick(e, item.isPanels ? panelsHref : `${base}/${item.to}`)}
                        className={itemClass(location.pathname === base || location.pathname.startsWith(`${base}/panel/`))}
                      >
                        <item.icon size={16} strokeWidth={2} />
                        {item.label}
                      </Link>
                    ) : (
                      <NavLink
                        key={item.to}
                        to={`${base}/${item.to}`}
                        onClick={(e) => handleNavClick(e, item.isPanels ? panelsHref : `${base}/${item.to}`)}
                        className={({ isActive }) => `${itemClass(isActive)} justify-between`}
                      >
                        <span className="flex items-center gap-2.5">
                          <item.icon size={16} strokeWidth={2} />
                          {item.label}
                          {(item.premium || group.premium) && !subscribed && (
                            <Crown size={12} className="text-amber-400 shrink-0" strokeWidth={2.5} />
                          )}
                        </span>
                        {item.toggleKey && TOGGLES[item.toggleKey] && (
                          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                            <Toggle checked={TOGGLES[item.toggleKey].checked} onChange={TOGGLES[item.toggleKey].onChange} />
                          </span>
                        )}
                      </NavLink>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <a
        href={INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2 mt-4 rounded-lg text-sm font-medium text-cyan-400 border border-cyan-400/25 hover:bg-cyan-400/10 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] transition-all duration-150"
      >
        <UserPlus size={16} strokeWidth={2} />
        Invite bot to a server
      </a>
      <div className="px-1">
        <AdminInviteNote guildId={guildId} />
      </div>

      <NavLink
        to={`/guild/${guildId}/billing`}
        onClick={(e) => handleNavClick(e, `/guild/${guildId}/billing`)}
        className={({ isActive }) =>
          `flex items-center gap-2.5 px-3 py-2 mt-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            isActive
              ? "text-cyan-400 border border-cyan-400/40 bg-cyan-400/10"
              : "text-gray-300 border border-white/10 hover:bg-white/5"
          }`
        }
      >
        <CreditCard size={16} strokeWidth={2} />
        Billing
      </NavLink>

      {DONATE_URL && (
        <a
          href={DONATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2 mt-2 rounded-lg text-sm font-medium text-amber-400 border border-amber-400/25 hover:bg-amber-400/10 hover:shadow-[0_0_16px_rgba(251,191,36,0.2)] transition-all duration-150"
        >
          <Coffee size={16} strokeWidth={2} />
          Buy me a coffee
        </a>
      )}

      <div className="mt-auto pt-4 border-t border-white/5">
        <a href="/" onClick={(e) => handleNavClick(e, "/")} className="text-xs text-gray-500 hover:text-gray-300 px-1">
          ← All servers
        </a>
      </div>
    </div>
  );
}
