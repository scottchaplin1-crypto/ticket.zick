import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

const PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK;

export default function Billing({ guildId }) {
  const [status, setStatus] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  useEffect(() => {
    api.get(`/api/billing/guild/${guildId}/status`).then((res) => setStatus(res.data));
  }, [guildId]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const returnUrl = window.location.href;
      const { data } = await api.get(`/api/billing/guild/${guildId}/portal?returnUrl=${encodeURIComponent(returnUrl)}`);
      window.location.href = data.url;
    } catch (err) {
      setPortalError(err.response?.data?.error || "Couldn't open the billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  const upgradeUrl = PAYMENT_LINK ? `${PAYMENT_LINK}?client_reference_id=${guildId}` : null;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tickets stay free on every server, always. Everything else — Economy, Giveaways, Polls, Reaction Roles,
        Welcome &amp; Goodbye, and more — is part of Premium.
      </p>

      {portalError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">{portalError}</div>
      )}

      {status && (
        <Card>
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/5">
            <CreditCard size={15} className="text-cyan-400" />
            <h3 className="font-semibold text-gray-200 text-sm">Current plan</h3>
          </div>

          {status.subscribed ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle2 size={16} />
                {status.exempt ? "Premium (exempt server)" : "Premium — active"}
              </p>
              {!status.exempt && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-surface3 hover:bg-white/10 transition rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  <ExternalLink size={14} /> {portalLoading ? "Opening…" : "Manage subscription"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">This server is on the free plan — tickets work fully, everything else is locked.</p>
              {upgradeUrl ? (
                <a
                  href={upgradeUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg text-sm font-medium"
                >
                  <Sparkles size={14} /> Upgrade to Premium
                </a>
              ) : (
                <p className="text-xs text-amber-400">Upgrade link isn't configured yet.</p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
