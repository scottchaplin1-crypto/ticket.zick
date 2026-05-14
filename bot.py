import discord
from discord import app_commands
from discord.ext import commands
import os
import sqlite3

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

@bot.event
async def on_ready():
    print(f"✅ Ticket Zick is online as {bot.user}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)

# Simple Ticket Modal
class TicketModal(discord.ui.Modal, title="🎟️ Open a New Ticket"):
    ticket_type = discord.ui.Select(
        placeholder="Select ticket type...",
        options=[
            discord.SelectOption(label="General Support", value="support", emoji="🛠️"),
            discord.SelectOption(label="Player Report", value="report", emoji="🚨"),
            discord.SelectOption(label="Ban Appeal", value="appeal", emoji="⚖️"),
            discord.SelectOption(label="Other", value="other", emoji="❓"),
        ]
    )
    reason = discord.ui.TextInput(label="Describe your issue", style=discord.TextStyle.paragraph, required=True, max_length=1000)

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer()

        guild = interaction.guild
        user = interaction.user

        channel = await guild.create_text_channel(
            name=f"ticket-{user.name}",
            topic=f"Ticket by {user} • Type: {self.ticket_type.values[0]}"
        )

        await channel.set_permissions(guild.default_role, read_messages=False)
        await channel.set_permissions(user, read_messages=True, send_messages=True)

        embed = discord.Embed(title=f"New {self.ticket_type.values[0].title()} Ticket", color=0x00ff88)
        embed.add_field(name="User", value=user.mention, inline=False)
        embed.add_field(name="Reason", value=self.reason.value, inline=False)

        await channel.send(f"{user.mention}", embed=embed)
        await interaction.followup.send(f"✅ Ticket created! {channel.mention}", ephemeral=True)

# Setup Command
@bot.tree.command(name="setup", description="Create ticket panel")
@app_commands.default_permissions(administrator=True)
async def setup(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🎟️ Ticket Zick Support",
        description="Click the button below to open a ticket.",
        color=0x00ffff
    )
    
    class SimpleView(discord.ui.View):
        @discord.ui.button(label="Create Ticket", style=discord.ButtonStyle.primary, emoji="🎟️")
        async def create(self, interaction: discord.Interaction, button: discord.ui.Button):
            await interaction.response.send_modal(TicketModal())

    view = SimpleView()
    await interaction.channel.send(embed=embed, view=view)
    await interaction.response.send_message("✅ Panel created!", ephemeral=True)

bot.run(os.getenv("TOKEN"))