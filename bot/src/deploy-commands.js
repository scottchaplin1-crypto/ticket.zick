// Optional manual/local script. You do NOT need to run this on Render — the bot
// registers its commands automatically on startup (see src/index.js). This file is
// only useful if you want instant guild-scoped commands while testing locally:
//   node src/deploy-commands.js <your-test-guild-id>
import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands, deployGlobalCommands } from "./commands/registry.js";

const guildId = process.argv[2];

if (guildId) {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId), { body: commands });
  console.log(`Deployed ${commands.length} guild commands to ${guildId} (instant).`);
} else {
  await deployGlobalCommands();
}
