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
        print(f"✅ Synced {len(synced)} commands")
    except Exception as e:
        print("Sync error:", e)

@bot.tree.command(name="newticket", description="Create a new ticket")
async def newticket(interaction: discord.Interaction):
    await interaction.response.send_message("✅ Creating your ticket channel...", ephemeral=True)

    try:
        channel = await interaction.guild.create_text_channel(f"ticket-{interaction.user.name}")
        
        await channel.set_permissions(interaction.guild.default_role, read_messages=False)
        await channel.set_permissions(interaction.user, read_messages=True, send_messages=True)

        await channel.send(f"👋 {interaction.user.mention} Welcome to your ticket!\nStaff will be here soon.")
        await interaction.edit_original_response(content=f"✅ Ticket created! {channel.mention}")
    except Exception as e:
        await interaction.edit_original_response(content="❌ Failed to create ticket.")

@bot.tree.command(name="setup", description="Setup info")
@app_commands.default_permissions(administrator=True)
async def setup(interaction: discord.Interaction):
    await interaction.response.send_message("Use `/newticket` to create a ticket.")

bot.run(os.getenv("TOKEN"))