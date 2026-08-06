import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// Discord login lands here after the server finishes the OAuth exchange. The server
// hands us the login token via ?token=... in the URL — we save it and move on.
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      localStorage.setItem("tz_token", token);
      navigate("/", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, []);

  return <div className="min-h-screen flex items-center justify-center text-gray-400">Logging you in...</div>;
}
