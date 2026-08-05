import axios from "axios";

const API_BASE = "https://discord.com/api/v10";

export const discordApi = axios.create({
  baseURL: API_BASE,
});

// Bot-authenticated client for privileged actions (creating channels, roles etc.)
export const botApi = axios.create({
  baseURL: API_BASE,
  headers: {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
  },
});

export async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });
  const { data } = await discordApi.post("/oauth2/token", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return data; // { access_token, refresh_token, ... }
}

export async function getDiscordUser(accessToken) {
  const { data } = await discordApi.get("/users/@me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

export async function getUserGuilds(accessToken) {
  const { data } = await discordApi.get("/users/@me/guilds", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}
