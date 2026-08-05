import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("panel-send")
    .setDescription("Post a Ticket Zick panel in this channel")
    .addStringOption((opt) =>
      opt.setName("panel_id").setDescription("Panel ID from the dashboard").setRequired(true)
    ),
  new SlashCommandBuilder().setName("close").setDescription("Close the current ticket"),
  new SlashCommandBuilder().setName("claim").setDescription("Claim the current ticket"),
  new SlashCommandBuilder().setName("unclaim").setDescription("Unclaim the current ticket"),
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add a user to this ticket")
    .addUserOption((opt) => opt.setName("user").setDescription("User to add").setRequired(true)),
  new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a user from this ticket")
    .addUserOption((opt) => opt.setName("user").setDescription("User to remove").setRequired(true)),
].map((c) => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);

const guildId = process.argv[2]; // optional: pass a guild id for instant (guild-scoped) deploy while testing

try {
  if (guildId) {
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
      { body: commands }
    );
    console.log(`Deployed ${commands.length} guild commands to ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log(`Deployed ${commands.length} global commands (may take up to 1hr to appear)`);
  }
} catch (err) {
  console.error(err);
}
