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
  // !balance, !store, !buy, and !work are prefix commands instead (see
  // bot/src/handlers/economyPrefix.js) — casual, frequently-used commands feel
  // snappier that way. give-currency stays a slash command since it's a
  // staff-only management action, restricted by Discord's own permissions below.
  new SlashCommandBuilder()
    .setName("give-currency")
    .setDescription("Grant (or remove) currency from a member")
    .addUserOption((opt) => opt.setName("user").setDescription("Who to give it to").setRequired(true))
    .addIntegerOption((opt) => opt.setName("amount").setDescription("Amount — use a negative number to remove").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage giveaways")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a new giveaway")
        .addStringOption((opt) => opt.setName("prize").setDescription("What's being given away").setRequired(true))
        .addStringOption((opt) => opt.setName("duration").setDescription("e.g. 30m, 2h, 1d, 1w").setRequired(true))
        .addStringOption((opt) => opt.setName("description").setDescription("Extra details (optional)"))
        .addIntegerOption((opt) => opt.setName("winners").setDescription("How many winners (default 1)"))
        .addRoleOption((opt) => opt.setName("required_role").setDescription("Role required to enter (optional)"))
    )
    .addSubcommand((sub) => sub.setName("end").setDescription("End the active giveaway in this channel early")),
  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create and manage polls")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Start a new poll")
        .addStringOption((opt) => opt.setName("question").setDescription("The question to ask").setRequired(true))
        .addStringOption((opt) => opt.setName("options").setDescription("Comma-separated, e.g. Pizza, Tacos, Sushi").setRequired(true))
        .addStringOption((opt) => opt.setName("duration").setDescription("e.g. 30m, 2h, 1d, 1w").setRequired(true))
    )
    .addSubcommand((sub) => sub.setName("end").setDescription("End the active poll in this channel early")),
].map((c) => c.toJSON());

// Registers commands globally with Discord. Safe to call every time the bot boots —
// Discord just overwrites the existing list with the same one. Global commands can take
// up to ~1 hour to show up the very first time; after that, updates are much faster.
export async function deployGlobalCommands() {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
  console.log(`Registered ${commands.length} global slash commands.`);
}
