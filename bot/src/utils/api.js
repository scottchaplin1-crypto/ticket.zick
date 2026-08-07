import axios from "axios";
import "dotenv/config";

// The bot authenticates to the backend API with the bot token as a shared secret
// (see server/src/middleware/auth.js -> requireBotSecret). A timeout is set so a
// bad API_URL or a hung request fails fast with a clear error instead of leaving
// Discord interactions stuck on "thinking..." forever.
export const api = axios.create({
  baseURL: process.env.API_URL,
  timeout: 10000,
  headers: { "x-bot-secret": process.env.DISCORD_BOT_TOKEN },
});
