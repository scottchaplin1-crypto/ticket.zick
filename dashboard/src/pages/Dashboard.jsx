import { Routes, Route, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { UnsavedChangesProvider } from "../context/UnsavedChangesContext.jsx";
import Sidebar from "../components/Sidebar.jsx";
import PanelBuilder from "./PanelBuilder.jsx";
import Tickets from "./Tickets.jsx";
import Branding from "./Branding.jsx";
import StaffRoles from "./StaffRoles.jsx";
import QuickCommands from "./QuickCommands.jsx";
import WelcomeGoodbye from "./WelcomeGoodbye.jsx";
import ReactionRoles from "./ReactionRoles.jsx";
import CustomCommands from "./CustomCommands.jsx";
import BotProfile from "./BotProfile.jsx";
import EmbedMessages from "./EmbedMessages.jsx";

export default function Dashboard() {
  const { guildId } = useParams();
  const [guild, setGuild] = useState(null);

  useEffect(() => {
    api.get(`/api/guilds/${guildId}`).then((res) => setGuild(res.data));
  }, [guildId]);

  return (
    <UnsavedChangesProvider>
      <div className="flex">
        <Sidebar guildId={guildId} guildName={guild?.name || "…"} />
        <div className="flex-1 p-8 max-w-5xl">
          <Routes>
            <Route index element={<PanelBuilder guildId={guildId} />} />
            <Route path="panel/:panelId" element={<PanelBuilder guildId={guildId} />} />
            <Route path="tickets" element={<Tickets guildId={guildId} />} />
            <Route path="branding" element={<Branding guildId={guildId} />} />
            <Route path="staff" element={<StaffRoles guildId={guildId} />} />
            <Route path="quick-commands" element={<QuickCommands guildId={guildId} />} />
            <Route path="welcome" element={<WelcomeGoodbye guildId={guildId} />} />
            <Route path="reaction-roles" element={<ReactionRoles guildId={guildId} />} />
            <Route path="commands" element={<CustomCommands guildId={guildId} />} />
            <Route path="bot-profile" element={<BotProfile guildId={guildId} />} />
            <Route path="embed-messages" element={<EmbedMessages guildId={guildId} />} />
          </Routes>
        </div>
      </div>
    </UnsavedChangesProvider>
  );
}
