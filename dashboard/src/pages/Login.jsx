import Logo from "../components/Logo.jsx";

export default function Login() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI;
  const scope = "identify guilds";

  const authorizeUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(scope)}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 px-4">
      <Logo size={52} />
      <p className="text-gray-400 max-w-sm text-center -mt-3 leading-relaxed">
        Multi-server Discord ticketing, fully customisable. Log in with Discord to set up your server.
      </p>
      <a
        href={authorizeUrl}
        className="px-6 py-3 rounded-xl bg-blurple hover:bg-indigo-500 transition font-semibold shadow-lg shadow-blurple/20"
      >
        Continue with Discord
      </a>
    </div>
  );
}
