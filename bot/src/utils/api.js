import axios from "axios";
import "dotenv/config";

// The bot authenticates to the backend API with the bot token as a shared secret
// (see server/src/middleware/auth.js -> requireBotSecret)
export const api = axios.create({
  baseURL: process.env.API_URL,
  headers: { "x-bot-secret": process.env.DISCORD_BOT_TOKEN },
});
