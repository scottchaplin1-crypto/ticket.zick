import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api/client.js";
import Login from "./pages/Login.jsx";
import AuthCallback from "./pages/AuthCallback.jsx";
import GuildSelect from "./pages/GuildSelect.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import BillingReturn from "./pages/BillingReturn.jsx";

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    if (!localStorage.getItem("tz_token")) {
      setUser(null);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("tz_token");
        setUser(null);
      });
  }, []);

  if (user === undefined) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/billing-return" element={<BillingReturn />} />
      <Route path="/" element={user ? <GuildSelect user={user} /> : <Navigate to="/login" />} />
      <Route path="/guild/:guildId/*" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
    </Routes>
  );
}
