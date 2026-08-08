import { useEffect, useState } from "react";
import { BarChart3, Info } from "lucide-react";
import { api } from "../api/client.js";
import Card from "../components/Card.jsx";

export default function Polls({ guildId }) {
  const [polls, setPolls] = useState([]);

  useEffect(() => {
    api.get(`/api/polls/guild/${guildId}`).then((res) => setPolls(res.data));
  }, [guildId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-bold">Polls</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 flex items-start gap-1.5">
        <Info size={13} className="shrink-0 mt-0.5" />
        Polls are entirely command-driven — use <code className="text-gray-300">/poll create</code> in any channel,
        and <code className="text-gray-300">/poll end</code> in the same channel to close it and post results early.
        This page is just for checking status.
      </p>

      <Card title={`All polls (${polls.length})`}>
        <div className="divide-y divide-white/5">
          {polls.map((p) => {
            let options = [];
            try {
              options = JSON.parse(p.options || "[]");
            } catch {
              options = [];
            }
            return (
              <div key={p.id} className="py-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-200 font-medium flex items-center gap-1.5">
                    <BarChart3 size={13} className="text-cyan-400" />
                    {p.question}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.ended ? "bg-surface3 text-gray-400" : "bg-green-500/15 text-green-400"}`}>
                    {p.ended ? "Ended" : "Active"}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{options.join(" · ")}</p>
                <p className="text-xs text-gray-500 mt-1">
                  hosted by &lt;@{p.hostId}&gt; · ends {new Date(p.endsAt).toLocaleString()}
                </p>
              </div>
            );
          })}
          {polls.length === 0 && <p className="text-sm text-gray-500">No polls yet.</p>}
        </div>
      </Card>
    </div>
  );
}
