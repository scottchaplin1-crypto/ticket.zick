import "dotenv/config";
import http from "http";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { registerInteractionHandler } from "./handlers/interactionCreate.js";
import { handleMessageCreate } from "./handlers/messageCreate.js";
import { deployGlobalCommands } from "./commands/registry.js";

const PORT = process.env.PORT || 3000;
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Ticket Zick bot is running.");
  })
  .listen(PORT, () => console.log(`Health check server listening on port ${PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Ticket Zick bot online as ${c.user.tag}`);
  try {
    await deployGlobalCommands();
  } catch (err) {
    console.error("Failed to register slash commands:", err.message);
  }
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (bot stayed alive):", err?.message || err);
});

registerInteractionHandler(client);
client.on(Events.MessageCreate, (message) => {
  handleMessageCreate(message).catch((err) => console.error("messageCreate handler error:", err.message));
});

client.login(process.env.DISCORD_BOT_TOKEN);
