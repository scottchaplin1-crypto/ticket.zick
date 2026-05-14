import discord
from discord import app_commands
from discord.ext import commands
import os
import sqlite3

intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

# Settings Database
conn = sqlite3.connect("config.db")
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)''')
conn.commit()

def get_setting(key, default=None):
    c.execute("SELECT value FROM settings WHERE key = ?", (key,))
    result = c.fetchone()
    return result[0] if result else default

def set_setting(key, value):
    c.execute("REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()

@bot.event
async def on_ready():
    print(f"✅ Ticket Zick is online as {bot.user}")
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} commands")
    except Exception as e:
        print(e)

@bot.tree.command(name="newticket", description="Create a new ticket")
async def newticket(interaction: discord.Interaction):
    await interaction.response.send_message("✅ Creating ticket...", ephemeral=True)

    try:
        category_id = get_setting("ticket_category")
        category = discord.utils.get(interaction.guild.categories, id=int(category_id)) if category_id else None

        channel = await interaction.guild.create_text_channel(
            name=f"ticket-{interaction.user.name}",
            category=category
        )
        
        await channel.set_permissions(interaction.guild.default_role, read_messages=False)
        await channel.set_permissions(interaction.user, read_messages=True, send_messages=True)

        await channel.send(f"👋 {interaction.user.mention} Welcome to your ticket!\nStaff will be here soon.")
        await interaction.edit_original_response(content=f"✅ Ticket created! {channel.mention}")
        
    except Exception as e:
        await interaction.edit_original_response(content="❌ Error creating ticket.")

@bot.tree.command(name="setcategory", description="Set the category where tickets are created")
@app_commands.default_permissions(administrator=True)
async def setcategory(interaction: discord.Interaction, category_id: str):
    set_setting("ticket_category", category_id)
    await interaction.response.send_message(f"✅ Tickets will now be created in category ID: **{category_id}**", ephemeral=True)

@bot.tree.command(name="setup", description="Show setup info")
@app_commands.default_permissions(administrator=True)
async def setup(interaction: discord.Interaction):
    await interaction.response.send_message("Use `/newticket` to create tickets.\nUse `/setcategory <id>` to set ticket category.")

bot.run(os.getenv("TOKEN"))