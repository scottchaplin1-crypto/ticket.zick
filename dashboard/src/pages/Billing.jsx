import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, ExternalLink, Sparkles, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

const MONTHLY_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK_MONTHLY;
const YEARLY_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK_YEARLY;

export default function Billing({ guildId }) {
  const [status, setStatus] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  useEffect(() => {
    api
      .post(`/api/billing/guild/${guildId}/refresh`)
      .catch(() => {}) // non-fatal — worst case this page shows a slightly stale cached value
      .then(() => api.get(`/api/billing/guild/${guildId}/status`))
      .then((res) => setStatus(res.data))
      .catch(() => setStatus({ subscribed: false, status: "inactive" }));
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

  const monthlyUrl = MONTHLY_LINK ? `${MONTHLY_LINK}?client_reference_id=${guildId}` : null;
  const yearlyUrl = YEARLY_LINK ? `${YEARLY_LINK}?client_reference_id=${guildId}` : null;

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
        <div className="space-y-4">
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
              <p className="text-sm text-gray-400">This server is on the free plan — tickets work fully, everything else is locked.</p>
            )}
          </Card>

          {!status.subscribed && (
            <>
              <div className="flex items-start gap-2 bg-amber-400/10 border border-amber-400/25 rounded-lg px-4 py-3 text-xs text-amber-300">
                <Info size={14} className="shrink-0 mt-0.5" />
                <span>
                  Premium is a work in progress — what's included today will keep growing. Pricing and features may
                  change as new things get added, but you'll never lose access to what you're already paying for.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface2/90 border border-white/5 rounded-xl p-5">
                  <p className="text-sm text-gray-400 mb-1">Monthly</p>
                  <p className="text-3xl font-bold mb-1">
                    £5<span className="text-base font-normal text-gray-500">/month</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-4">Cancel any time.</p>
                  {monthlyUrl ? (
                    <a
                      href={monthlyUrl}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-surface3 hover:bg-white/10 transition rounded-lg text-sm font-medium"
                    >
                      <Sparkles size={14} /> Choose Monthly
                    </a>
                  ) : (
                    <p className="text-xs text-amber-400">Monthly link isn't configured yet.</p>
                  )}
                </div>

                <div className="relative bg-surface2/90 border border-cyan-400/40 rounded-xl p-5 shadow-lg shadow-cyan-500/10">
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 bg-cyan-500 text-[#0b1416] text-[10px] font-bold rounded-full">
                    SAVE £10
                  </span>
                  <p className="text-sm text-gray-400 mb-1">Yearly</p>
                  <p className="text-3xl font-bold mb-1">
                    £50<span className="text-base font-normal text-gray-500">/year</span>
                  </p>
                  <p className="text-xs text-gray-500 mb-4">Works out to about £4.17/month.</p>
                  {yearlyUrl ? (
                    <a
                      href={yearlyUrl}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-[#0b1416] shadow-md shadow-cyan-500/20 transition rounded-lg text-sm font-medium"
                    >
                      <Sparkles size={14} /> Choose Yearly
                    </a>
                  ) : (
                    <p className="text-xs text-amber-400">Yearly link isn't configured yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
