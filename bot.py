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
        print("Sync error:", e)

@bot.tree.command(name="newticket", description="Open a new ticket")
async def newticket(interaction: discord.Interaction):
    await interaction.response.send_message("✅ Ticket system is working! Channel will be created soon...", ephemeral=True)
    
    # Simple channel creation
    guild = interaction.guild
    user = interaction.user
    channel = await guild.create_text_channel(name=f"ticket-{user.name}")
    
    await channel.set_permissions(guild.default_role, read_messages=False)
    await channel.set_permissions(user, read_messages=True, send_messages=True)
    
    await channel.send(f"{user.mention} Welcome to your ticket!")

@bot.tree.command(name="setup", description="Show ticket info")
@app_commands.default_permissions(administrator=True)
async def setup(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🎟️ Ticket Zick",
        description="Use `/newticket` to create a ticket.",
        color=0x00ffff
    )
    await interaction.response.send_message(embed=embed)

bot.run(os.getenv("TOKEN"))