import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles } from "lucide-react";
import { api } from "../api/client.js";

// Wraps any paid-feature page. Unlike a hard paywall, this still shows the real
// page underneath — dimmed and unclickable — so people can see exactly what
// they'd be unlocking instead of hitting a blank wall. Nothing here is the
// actual security boundary: every underlying API route is independently gated
// server-side too (see server/src/middleware/subscription.js), so dimming the
// UI can't be bypassed into actually saving anything.
export default function PremiumGate({ guildId, feature, children }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get(`/api/billing/guild/${guildId}/status`).then((res) => setStatus(res.data));
  }, [guildId]);

  if (!status) return <p className="text-gray-500">Loading…</p>;

  if (status.subscribed) return children;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5 bg-cyan-400/10 border border-cyan-400/25 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-cyan-300">
          <Lock size={15} className="shrink-0" />
          <span>
            <strong>{feature || "This"}</strong> is part of Ticket Zick Premium — look around freely, but saving or
            sending anything needs an upgrade first.
          </span>
        </div>
        <Link
          to={`/guild/${guildId}/billing`}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] rounded-lg text-xs font-medium"
        >
          <Sparkles size={13} /> Upgrade
        </Link>
      </div>
      <div className="opacity-60 pointer-events-none select-none">{children}</div>
    </div>
  );
}
