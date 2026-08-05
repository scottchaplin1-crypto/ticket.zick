import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api/client.js";
import Login from "./pages/Login.jsx";
import GuildSelect from "./pages/GuildSelect.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={user ? <GuildSelect user={user} /> : <Navigate to="/login" />} />
      <Route path="/guild/:guildId/*" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
    </Routes>
  );
}
