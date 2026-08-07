import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";

export const commands = [
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
  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user — @mention or raw user ID, works even if they've never joined")
    .addStringOption((opt) => opt.setName("user").setDescription("@mention or Discord user ID").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a current member")
    .addStringOption((opt) => opt.setName("user").setDescription("@mention or Discord user ID").setRequired(true))
    .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the kick"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName("balance").setDescription("Check your currency balance"),
  new SlashCommandBuilder().setName("store").setDescription("See what's available to buy"),
  new SlashCommandBuilder()
    .setName("buy")
    .setDescription("Buy an item from the store")
    .addStringOption((opt) => opt.setName("item").setDescription("Which item").setRequired(true).setAutocomplete(true)),
  new SlashCommandBuilder()
    .setName("give-currency")
    .setDescription("Grant (or remove) currency from a member")
    .addUserOption((opt) => opt.setName("user").setDescription("Who to give it to").setRequired(true))
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount — use a negative number to remove").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map((c) => c.toJSON());

// Registers commands globally with Discord. Safe to call every time the bot boots —
// Discord just overwrites the existing list with the same one. Global commands can take
// up to ~1 hour to show up the very first time; after that, updates are much faster.
export async function deployGlobalCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
  console.log(`Registered ${commands.length} global slash commands.`);
}
