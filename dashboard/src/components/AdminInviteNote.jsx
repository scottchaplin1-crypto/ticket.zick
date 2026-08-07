import { useState } from "react";
import { ShieldAlert } from "lucide-react";

const ADMIN_PERMISSIONS = 8; // Administrator bit

export default function AdminInviteNote({ guildId }) {
  const [open, setOpen] = useState(false);
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const adminUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${ADMIN_PERMISSIONS}&scope=${encodeURIComponent(
    "bot applications.commands"
  )}${guildId ? `&guild_id=${guildId}&disable_guild_select=true` : ""}`;

  return (
    <div className="mt-1.5">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-gray-500 hover:text-gray-300 transition underline decoration-dotted">
        Getting permission errors? There's a simpler option.
      </button>
      {open && (
        <div className="mt-2 flex items-start gap-2 text-xs text-gray-400 bg-surface2 border border-white/5 rounded-lg p-3">
          <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            Ticket Zick asks for exactly the Discord permissions it needs, no more — but some server setups (custom
            channel/category permission overwrites, restrictive role hierarchies) can still cause a "Missing
            Permissions" error somewhere. If that happens and you'd rather not troubleshoot it,{" "}
            <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline font-medium">
              re-invite the bot with Administrator instead
            </a>
            . That fixes every permission issue at once, since it bypasses per-channel restrictions entirely. The
            tradeoff: it's a broad grant, so only do this on a server you trust the bot's setup on.
          </div>
        </div>
      )}
    </div>
  );
}
