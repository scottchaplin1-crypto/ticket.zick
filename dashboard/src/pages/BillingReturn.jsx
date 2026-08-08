import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { api } from "../api/client.js";
import Logo from "../components/Logo.jsx";

// The one fixed page Stripe redirects every customer back to after paying,
// regardless of which server they were upgrading — a Payment Link's redirect
// URL can't vary per-customer, so this can't know the guild ID from the URL.
// Instead, it asks the server to look up which guild this payment was
// actually for (Stripe already knows, from client_reference_id recorded at
// checkout), then forwards on to that server's own Billing page.
export default function BillingReturn() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [guildId, setGuildId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment confirmation — if you just paid, use the link Stripe emailed you as a receipt instead.");
      return;
    }
    api
      .post("/api/billing/confirm", { sessionId })
      .then((res) => setGuildId(res.data.guildId))
      .catch((err) => setError(err.response?.data?.error || "Couldn't confirm that payment."));
  }, [sessionId]);

  if (guildId) return <Navigate to={`/guild/${guildId}/billing`} replace />;

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 px-4">
      <Logo size={40} />
      {error ? (
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
      ) : (
        <p className="text-gray-400 text-sm">Confirming your payment…</p>
      )}
    </div>
  );
}
