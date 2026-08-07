import "dotenv/config";
import http from "http";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { registerInteractionHandler } from "./handlers/interactionCreate.js";
import { handleMessageCreate } from "./handlers/messageCreate.js";
import { tryHandleCustomCommand } from "./handlers/customCommands.js";
import { handleMemberAdd, handleMemberRemove } from "./handlers/memberEvents.js";
import { handleReactionAdd, handleReactionRemove } from "./handlers/reactionRoles.js";
import { tryEarn, messageHasGif } from "./utils/economyEarn.js";
import { tryHandleEconomyPrefix } from "./handlers/economyPrefix.js";
import { deployGlobalCommands } from "./commands/registry.js";

// Render's free plan only supports "Web Service" (not "Background Worker"), and web
// services must respond on a port to be considered healthy. This tiny server exists
// purely to satisfy that check — it has nothing to do with the bot's actual logic.
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
    GatewayIntentBits.GuildMessageReactions,
  ],
  // Partials let the bot receive events for things it doesn't have cached — e.g. a
  // reaction on a message sent before the bot's last restart. Without these, reaction
  // role toggling would silently stop working after every deploy.
  partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.User, Partials.GuildMember],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Ticket Zick bot online as ${c.user.tag}`);
  try {
    await deployGlobalCommands();
  } catch (err) {
    console.error("Failed to register slash commands:", err.message);
  }
});

// A single failed Discord API call (e.g. missing permissions) shouldn't take the
// whole bot down — log it and keep running instead of crashing.
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection (bot stayed alive):", err?.message || err);
});

registerInteractionHandler(client);

client.on(Events.MessageCreate, async (message) => {
  try {
    const handledAsQuickAdd = await handleMessageCreate(message);
    if (!handledAsQuickAdd) {
      const handledAsCustomCommand = await tryHandleCustomCommand(message);
      if (!handledAsCustomCommand) await tryHandleEconomyPrefix(message);
    }
  } catch (err) {
    console.error("messageCreate handler error:", err.message);
  }

  if (!message.author.bot && message.guild) {
    tryEarn(message.guild, message.author.id, "message").catch(() => {});
    if (messageHasGif(message)) {
      tryEarn(message.guild, message.author.id, "gif").catch(() => {});
    }
  }
});

client.on(Events.GuildMemberAdd, (member) => {
  handleMemberAdd(member).catch((err) => console.error("memberAdd handler error:", err.message));
});
client.on(Events.GuildMemberRemove, (member) => {
  handleMemberRemove(member).catch((err) => console.error("memberRemove handler error:", err.message));
});

client.on(Events.MessageReactionAdd, (reaction, user) => {
  handleReactionAdd(reaction, user).catch((err) => console.error("reactionAdd handler error:", err.message));
  if (!user.bot && reaction.message?.guild) {
    tryEarn(reaction.message.guild, user.id, "reaction").catch(() => {});
  }
});
client.on(Events.MessageReactionRemove, (reaction, user) => {
  handleReactionRemove(reaction, user).catch((err) => console.error("reactionRemove handler error:", err.message));
});

client.on(Events.ThreadCreate, async (thread) => {
  try {
    if (!thread.ownerId || !thread.guild) return;
    await tryEarn(thread.guild, thread.ownerId, "thread");
  } catch (err) {
    console.error("threadCreate earning error:", err.message);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
