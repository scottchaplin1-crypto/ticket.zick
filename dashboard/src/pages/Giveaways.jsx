import { useEffect, useState } from "react";
import { Gift, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";
import Tooltip from "../components/Tooltip.jsx";

export default function Giveaways({ guildId }) {
  const [giveaways, setGiveaways] = useState([]);

  useEffect(() => {
    api.get(`/api/giveaways/guild/${guildId}`).then((res) => setGiveaways(res.data));
  }, [guildId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-bold">Giveaways</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 flex items-start gap-1.5">
        <Info size={13} className="shrink-0 mt-0.5" />
        Giveaways are entirely command-driven — use <code className="text-gray-300">/giveaway start</code> in any
        channel to create one, and <code className="text-gray-300">/giveaway end</code> in the same channel to draw
        winners early. This page is just for checking status.
      </p>

      <Card title={`All giveaways (${giveaways.length})`}>
        <div className="divide-y divide-white/5">
          {giveaways.map((g) => (
            <div key={g.id} className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-200 font-medium flex items-center gap-1.5">
                  <Gift size={13} className="text-cyan-400" />
                  {g.prize}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${g.ended ? "bg-surface3 text-gray-400" : "bg-green-500/15 text-green-400"}`}>
                  {g.ended ? "Ended" : "Active"}
                </span>
              </div>
              {g.description && <p className="text-sm text-gray-400 mt-1">{g.description}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {g.winnerCount} winner{g.winnerCount === 1 ? "" : "s"} · hosted by &lt;@{g.hostId}&gt; · ends{" "}
                {new Date(g.endsAt).toLocaleString()}
                {g.requiredRoleId && <> · requires a role</>}
              </p>
            </div>
          ))}
          {giveaways.length === 0 && <p className="text-sm text-gray-500">No giveaways yet.</p>}
        </div>
      </Card>
    </div>
  );
}
