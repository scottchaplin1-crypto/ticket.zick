import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

const STATUS_COLOR = { open: "text-yellow-400", claimed: "text-blue-400", closed: "text-gray-500" };

export default function Tickets({ guildId }) {
  const [tickets, setTickets] = useState(null);

  function load() {
    api.get(`/api/tickets/guild/${guildId}`).then((res) => setTickets(res.data));
  }

  useEffect(load, [guildId]);

  async function forceClose(ticketId) {
    if (!confirm("Mark this ticket as closed? Use this if its Discord channel was deleted manually instead of via /close.")) return;
    await api.patch(`/api/tickets/${ticketId}`, { status: "closed" });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tickets</h1>
      <Card>
        {!tickets && <p className="text-gray-500">Loading…</p>}
        {tickets?.length === 0 && <p className="text-gray-500">No tickets yet.</p>}
        <div className="divide-y divide-white/5">
          {tickets?.map((t) => (
            <div key={t.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">#{t.number} · {t.panel?.name}</p>
                <p className="text-xs text-gray-500">Opened by {t.openerUsername} · {new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                {t.transcriptUrl && (
                  <a href={t.transcriptUrl} target="_blank" className="text-xs text-cyan-400 hover:underline">Transcript</a>
                )}
                {t.status !== "closed" && (
                  <button onClick={() => forceClose(t.id)} className="text-xs text-red-400 hover:underline">
                    Mark closed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
