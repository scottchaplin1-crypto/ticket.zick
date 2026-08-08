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

// Discord rate-limits (429) were being treated as hard failures anywhere that
// loops through several requests in a row (checking each linked OSRS account,
// each economy balance, etc.) — a single transient rate limit would make that
// one person show up as "couldn't verify" even though nothing was actually
// wrong with their account. This retries automatically, honoring the wait time
// Discord itself tells us to use, so a rate limit just takes a little longer
// instead of silently failing.
//
// Also retries on connection-level failures (no HTTP response at all — a
// dropped connection, a network blip between Render and Discord, etc.) with
// growing wait times between attempts, since there's no retry_after to read for
// these. These aren't Discord's fault or ours; the network hiccupped mid-request.
// Unlike a rate limit, this can hit every request in a loop at once rather than
// just one, which is exactly what made it look like everyone's account had a
// problem when nothing was actually wrong with any of them.
const MAX_RATE_LIMIT_RETRIES = 3;
const MAX_NETWORK_RETRIES = 4;
const NETWORK_RETRY_DELAYS_MS = [500, 1000, 2000, 4000];
botApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    if (error.response?.status === 429 && (config._rateLimitRetries || 0) < MAX_RATE_LIMIT_RETRIES) {
      config._rateLimitRetries = (config._rateLimitRetries || 0) + 1;
      const retryAfterSeconds = error.response.data?.retry_after ?? 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfterSeconds * 1000 + 150));
      return botApi(config);
    }

    if (!error.response && (config._networkRetries || 0) < MAX_NETWORK_RETRIES) {
      const attempt = config._networkRetries || 0;
      config._networkRetries = attempt + 1;
      await new Promise((resolve) => setTimeout(resolve, NETWORK_RETRY_DELAYS_MS[attempt]));
      return botApi(config);
    }
    return Promise.reject(error);
  }
);

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
