import discord
from discord import app_commands
from discord.ext import commands
import os

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

@bot.tree.command(name="setup", description="Create the Ticket Panel")
@app_commands.default_permissions(administrator=True)
async def setup(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🎟️ Ticket Zick Support",
        description="Click the button below to create a ticket.",
        color=0x00ffff
    )
    
    view = discord.ui.View(timeout=None)
    button = discord.ui.Button(label="Create Ticket", style=discord.ButtonStyle.primary, emoji="🎟️")
    
    async def create_ticket(inter: discord.Interaction):
        await inter.response.send_message("✅ Ticket system coming soon...", ephemeral=True)
    
    button.callback = create_ticket
    view.add_item(button)
    
    await interaction.channel.send(embed=embed, view=view)
    await interaction.response.send_message("✅ Ticket panel created!", ephemeral=True)

bot.run(os.getenv("TOKEN"))