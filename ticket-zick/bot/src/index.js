import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { registerInteractionHandler } from "./handlers/interactionCreate.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Ticket Zick bot online as ${c.user.tag}`);
});

registerInteractionHandler(client);

client.login(process.env.DISCORD_BOT_TOKEN);
